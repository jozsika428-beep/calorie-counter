# Food photo recognition model

- `aiy_food_v1_fp16.onnx` (10.7 MB): Google **AIY Vision Classifier food_V1**, which recognizes 2023 dishes plus a background class. It's a MobileNet V1 at 192×192 input.
  - Source: https://www.kaggle.com/models/google/aiy/tfLite/vision-classifier-food-v1 (TFLite, version 1).
  - License: **Apache License 2.0** (see `LICENSE-Apache-2.0.txt`). Copyright Google LLC.
  - Modifications: I converted the TFLite graph to ONNX with `../tools/convert_aiy_food.py` and stored the weights as float16 (half size). The input is float32 NCHW scaled to [-1, 1], and the output is softmax probabilities `[1, 2024]`. On the test photos the output matches the original TFLite model within 0.0013.
- `labels.json`: English class names from the model's embedded `probability-labels-en.txt`. The background class and the 45 classes that only have an internal ID and no name are empty strings.

Google's model card lists these limitations: it expects a well-cropped photo of a single dish, it was trained on data skewed toward North American foods, and it shouldn't be used to decide whether something is edible or to detect allergens or ingredients.
