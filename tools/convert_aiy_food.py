"""Usage: python3 convert_aiy_food.py 1.tflite out_f32.onnx out_small.onnx [fp16|int8]
(needs: pip install tflite onnx numpy). The app ships the fp16 variant as model/aiy_food_v1_fp16.onnx.

Convert Google's AIY food_V1 TFLite (MobileNet V1, float weights) into a small ONNX model
with fp16 (Cast) or int8 per-channel (DequantizeLinear) weight storage, runnable in onnxruntime-web.
Input: float32 [1,3,192,192] scaled to [-1,1] (== (uint8-128)/128). Output: softmax [1,2024]."""
import sys, numpy as np, tflite, onnx
from onnx import helper, TensorProto, numpy_helper

src, out_f, out_q = sys.argv[1], sys.argv[2], sys.argv[3]
MODE = sys.argv[4] if len(sys.argv) > 4 else 'int8'
buf = open(src, 'rb').read()
m = tflite.Model.GetRootAsModel(buf, 0); g = m.Subgraphs(0)
OPN = {v: k for k, v in tflite.BuiltinOperator.__dict__.items() if not k.startswith('_')}

def arr(ti):
    t = g.Tensors(ti); b = m.Buffers(t.Buffer())
    return np.frombuffer(b.DataAsNumpy().tobytes(), dtype=np.float32).reshape(t.ShapeAsNumpy())
def shape(ti): return list(g.Tensors(ti).ShapeAsNumpy())
def same_pads(inp, k, s):
    out = -(-inp // s); tot = max((out - 1) * s + k - inp, 0); return tot // 2, tot - tot // 2

def build(quant):
    nodes, inits = [], []
    names = {}
    def tname(ti): return names.setdefault(ti, 't%d' % ti)
    def weight(name, w, axis0_channels=True):
        if not quant:
            inits.append(numpy_helper.from_array(w.astype(np.float32), name)); return name
        if MODE == 'fp16':
            inits.append(numpy_helper.from_array(w.astype(np.float16), name + '_h'))
            nodes.append(helper.make_node('Cast', [name + '_h'], [name], to=TensorProto.FLOAT)); return name
        # symmetric per-output-channel int8
        flat = w.reshape(w.shape[0], -1)
        scale = np.maximum(np.abs(flat).max(1), 1e-12) / 127.0
        q = np.clip(np.round(flat / scale[:, None]), -127, 127).astype(np.int8).reshape(w.shape)
        inits.append(numpy_helper.from_array(q, name + '_q'))
        inits.append(numpy_helper.from_array(scale.astype(np.float32), name + '_s'))
        inits.append(numpy_helper.from_array(np.zeros(w.shape[0], np.int8), name + '_z'))
        nodes.append(helper.make_node('DequantizeLinear', [name + '_q', name + '_s', name + '_z'], [name], axis=0))
        return name
    inp_ti = g.Inputs(0)
    for i in range(g.OperatorsLength()):
        op = g.Operators(i); code = OPN[m.OperatorCodes(op.OpcodeIndex()).BuiltinCode()]
        ins = [j for j in op.InputsAsNumpy()]; outs = [j for j in op.OutputsAsNumpy()]
        if code == 'DEQUANTIZE':
            names[outs[0]] = 'input'; continue
        if code in ('CONV_2D', 'DEPTHWISE_CONV_2D'):
            o = op.BuiltinOptions()
            opt = tflite.Conv2DOptions() if code == 'CONV_2D' else tflite.DepthwiseConv2DOptions()
            opt.Init(o.Bytes, o.Pos)
            w = arr(ins[1]); b = arr(ins[2])
            if code == 'CONV_2D': W = w.transpose(0, 3, 1, 2); group = 1          # OHWI -> OIHW
            else: W = w.transpose(3, 0, 1, 2); group = W.shape[0]                # 1HWC -> C1HW
            kh, kw = W.shape[2], W.shape[3]; sh, sw = opt.StrideH(), opt.StrideW()
            ih, iw = shape(ins[0])[1:3]
            if opt.Padding() == tflite.Padding.SAME:
                pt, pb = same_pads(ih, kh, sh); pl, pr = same_pads(iw, kw, sw)
            else: pt = pb = pl = pr = 0
            # depthwise & first conv are tiny and quantization-sensitive: keep them float32
            if group > 1 or W.shape[1] == 3:
                wn = 'w%d' % i; inits.append(numpy_helper.from_array(W.astype(np.float32), wn))
            else:
                wn = weight('w%d' % i, W)
            bn = 'b%d' % i
            inits.append(numpy_helper.from_array(b.astype(np.float32), bn))
            act = opt.FusedActivationFunction()
            conv_out = tname(outs[0]) if act == 0 else 'c%d' % i
            nodes.append(helper.make_node('Conv', [tname(ins[0]), wn, bn], [conv_out], group=group,
                         kernel_shape=[kh, kw], strides=[sh, sw], pads=[pt, pl, pb, pr]))
            if act == tflite.ActivationFunctionType.RELU6:
                nodes.append(helper.make_node('Clip', [conv_out, 'zero', 'six'], [tname(outs[0])]))
            elif act != 0: raise SystemExit('unsupported activation %d' % act)
        elif code == 'AVERAGE_POOL_2D':
            nodes.append(helper.make_node('GlobalAveragePool', [tname(ins[0])], [tname(outs[0])]))
        elif code == 'RESHAPE':
            nodes.append(helper.make_node('Flatten', [tname(ins[0])], [tname(outs[0])], axis=1))
        elif code == 'SOFTMAX':
            nodes.append(helper.make_node('Softmax', [tname(ins[0])], ['probs'], axis=1))
        elif code == 'QUANTIZE':
            pass
        else: raise SystemExit('unsupported op ' + code)
    inits += [numpy_helper.from_array(np.array(0, np.float32), 'zero'), numpy_helper.from_array(np.array(6, np.float32), 'six')]
    graph = helper.make_graph(nodes, 'aiy_food_v1', [helper.make_tensor_value_info('input', TensorProto.FLOAT, [1, 3, 192, 192])],
                              [helper.make_tensor_value_info('probs', TensorProto.FLOAT, [1, 2024])], inits)
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid('', 13)], producer_name='calorie-app convert.py')
    model.ir_version = 8
    model.doc_string = 'Converted from Google AIY vision classifier food_V1 (Apache-2.0). MobileNet V1, 2023 dishes + background.'
    onnx.checker.check_model(model)
    return model

onnx.save(build(False), out_f); onnx.save(build(True), out_q)
print('ok')
