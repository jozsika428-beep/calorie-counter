/* On-device food photo recognition (lazy-loaded; nothing here runs until the Photo feature is used).
   Model: Google AIY "vision classifier food_V1" (MobileNet V1, 2023 dishes, Apache-2.0),
   converted to ONNX with fp16 weights (tools/convert_aiy_food.py) and run with ONNX Runtime Web (MIT).
   Photos are processed in memory in this browser only; they are never uploaded anywhere. */
(function () {
  'use strict';
  var BASE = (function () { var s = document.currentScript && document.currentScript.src; return s ? s.replace(/[^/]*$/, '') : ''; })();
  var FILES = {
    ort: BASE + 'vendor/ort/ort.wasm.min.js',
    mjs: BASE + 'vendor/ort/ort-wasm-simd-threaded.mjs',
    wasm: BASE + 'vendor/ort/ort-wasm-simd-threaded.wasm',
    model: BASE + 'model/aiy_food_v1_fp16.onnx',
    labels: BASE + 'model/labels.json'
  };
  var SIZE = 192;

  // Model class name -> search terms for the food list (foods.json / fallback). Terms are tried in order;
  // every word of a term must appear in a food name. Unlisted classes fall back to RULES, then to the class name.
  var MAP = {
    'Neapolitan pizza': ['pizza margherita', 'pizza'], 'New York-style pizza': ['pizza cheese', 'pizza'], 'Pizza': ['pizza'],
    'Chicago-style pizza': ['pizza'], 'California-style pizza': ['pizza'], 'Detroit-style pizza': ['pizza'], 'Pepperoni': ['pizza pepperoni', 'salami'],
    'Hamburger': ['mcdonald hamburger', 'beef burger', 'hamburger'], 'Cheeseburger': ['cheeseburger', 'quarter pounder'], 'Veggie burger': ['burger'],
    'Big Mac': ['big mac'], 'Whopper': ['whopper'],
    'Hot dog': ['hot dog'], 'Chicago-style hot dog': ['hot dog'], 'Coney Island hot dog': ['hot dog'], 'Michigan hot dog': ['hot dog'],
    'Sushi': ['sushi'], 'Nigiri': ['sushi nigiri'], 'California roll': ['sushi california'], 'Sashimi': ['smoked salmon', 'salmon'], 'Onigiri': ['white rice'],
    'Pancake': ['pannenkoek', 'pancake'], 'Pannenkoek': ['pannenkoek'], 'Crêpe': ['crepe'], 'Palatschinke': ['crepe'], 'Poffertjes': ['poffertjes'],
    'Waffle': ['waffle belgian', 'waffle'], 'Belgian waffle': ['waffle belgian'], 'Stroopwafel': ['stroopwafel'], 'Chicken and waffles': ['waffle', 'fried chicken'],
    'French toast': ['white bread', 'egg'],
    'Spaghetti': ['spaghetti bolognese', 'pasta cooked'], 'Spaghetti bolognese': ['spaghetti bolognese'], 'Bolognese sauce': ['spaghetti bolognese'],
    'Carbonara': ['pasta cooked', 'bacon'], 'Spaghetti aglio e olio': ['pasta cooked'], 'Spaghetti alle vongole': ['pasta cooked'], 'Penne alla vodka': ['pasta cooked'],
    'Fettuccine Alfredo': ['pasta cooked'], 'Pasta salad': ['pasta cooked'], 'Lasagne': ['lasagna'], 'Macaroni and cheese': ['macaroni cheese'],
    'Ravioli': ['pasta cooked'], 'Tortellini': ['pasta cooked'], 'Gnocchi': ['potatoes boiled'], 'Risotto': ['white rice'],
    'Fried rice': ['fried rice', 'nasi goreng'], 'Thai fried rice': ['fried rice'], 'Kimchi fried rice': ['fried rice'], 'American fried rice': ['fried rice'],
    'Nasi goreng': ['nasi goreng'], 'Nasi lemak': ['white rice'], 'White rice': ['white rice cooked'], 'Steamed rice': ['white rice cooked'], 'Paella': ['paella'],
    'Bami goreng': ['bami goreng'], 'Mie goreng': ['bami goreng'], 'Chow mein': ['bami goreng', 'egg noodles'], 'Lo mein': ['egg noodles'], 'Pad thai': ['pad thai'],
    'Ramen': ['egg noodles', 'chicken noodle soup'], 'Pho': ['rice noodles'], 'Chicken noodle soup': ['chicken noodle soup'],
    'Greek salad': ['feta', 'garden salad'], 'Caesar salad': ['caesar salad'], 'Cobb salad': ['garden salad', 'chicken breast'], 'Garden salad': ['garden salad'],
    'Salad': ['garden salad'], 'Potato salad': ['potatoes boiled', 'mayonnaise'], 'Waldorf salad': ['apple', 'walnut'], 'Caprese salad': ['mozzarella', 'tomato'],
    'Salade niçoise': ['tuna', 'garden salad'], 'Fruit salad': ['fruit salad'], 'Coleslaw': ['cabbage white'],
    'Apple pie': ['apple pie', 'appeltaart'], 'Dutch apple pie': ['appeltaart'], 'Apple strudel': ['apple turnover'], 'Strudel': ['apple turnover'],
    'Apple crisp': ['apple pie'], 'Apple cake': ['appeltaart'], 'Pumpkin pie': ['pumpkin'], 'Cheesecake': ['cheesecake'], 'Chocolate cake': ['chocolate cake'],
    'Chocolate brownie': ['brownie'], 'Brownie': ['brownie'], 'Cupcake': ['chocolate cake', 'muffin'], 'Poppyseed muffin': ['muffin'], 'Muffin': ['muffin'],
    'Pound cake': ['pound cake'], 'Butter cake': ['boterkoek'], 'Doughnut': ['doughnut'], 'Boston cream doughnut': ['doughnut'], 'Oliebol': ['oliebol'],
    'Churro': ['churros'], 'Churros': ['churros'], 'Tompouce': ['tompouce'], 'Danish pastry': ['danish pastry'], 'Croissant': ['croissant'],
    'Pain au chocolat': ['pain au chocolat'], 'Speculaas': ['speculaas'], 'Kruidnoten': ['kruidnoten'], 'Chocolate chip cookie': ['chocolate chip cookie'],
    'Cookie': ['cookie'], 'Macaron': ['macaroon'], 'Ice cream': ['ice cream'], 'Frozen yogurt': ['frozen yogurt'], 'Sundae': ['ice cream'],
    'Banana split': ['banana', 'ice cream'], 'Rice pudding': ['rice pudding'], 'Pudding': ['chocolate pudding'], 'Chocolate pudding': ['chocolate pudding'],
    'Omelette': ['omelet', 'egg scrambled'], 'Scrambled eggs': ['egg scrambled'], 'Fried egg': ['egg fried'], 'Boiled egg': ['eggs boiled'],
    'Deviled egg': ['eggs boiled'], 'Eggs Benedict': ['egg poached'], 'Poached egg': ['egg poached'], 'Uitsmijter': ['egg fried', 'white bread'],
    'Quiche': ['quiche'], 'Frittata': ['omelet'],
    'Stamppot': ['boerenkoolstamppot', 'stamppot'], 'Hutspot': ['hutspot'], 'Erwtensoep': ['erwtensoep'], 'Split pea soup': ['erwtensoep'],
    'Frikandel': ['frikandel'], 'Croquette': ['kroket', 'bitterballen'], 'Bitterballen': ['bitterballen'], 'Kroket': ['kroket'], 'Kapsalon': ['kapsalon'],
    'Dressed herring': ['herring'], 'Soused herring': ['herring'], 'Kibbeling': ['fried battered fish', 'lekkerbekje'], 'Loempia': ['loempia'], 'Spring roll': ['spring roll'],
    'Satay': ['satay', 'chicken breast'], 'Sate': ['satay'], 'Hachee': ['hachee'], 'Rookworst': ['rookworst'],
    'Home fries': ['potato baked', 'fries'], 'Cheese fries': ['fries', 'cheddar'], 'Carne asada fries': ['fries'], 'French fries': ['fries'], 'Chips': ['fries'],
    'Poutine': ['fries'], 'Onion rings': ['onion rings'], 'Chips and dip': ['crisps', 'tortilla chips'], 'Nachos': ['nachos'], 'Mashed potato': ['mashed potatoes'],
    'Baked potato': ['potato baked'], 'Hash browns': ['potato'],
    'Fried chicken': ['fried chicken', 'chicken drumstick'], 'Chicken nugget': ['chicken nuggets'], 'Buffalo wing': ['chicken wings'], 'Chicken wings': ['chicken wings'],
    'Roast chicken': ['chicken breast roasted', 'chicken thigh'], 'Chicken curry': ['chicken curry'], 'Butter chicken': ['chicken curry'], 'Tikka masala': ['chicken curry'],
    'Chicken tikka masala': ['chicken curry'], 'Red curry': ['chicken curry'], 'Green curry': ['chicken curry'], 'Japanese curry': ['chicken curry rice'],
    'Hainanese curry rice': ['chicken curry rice'], 'Mutton curry': ['chicken curry'], 'Phanaeng curry': ['chicken curry'], 'Massaman curry': ['chicken curry'],
    'Schnitzel': ['pork chop', 'breadcrumbs'], 'Wiener schnitzel': ['pork chop'], 'Steak': ['beef steak'], 'Steak tartare': ['steak tartare', 'filet americain'],
    'Meatball': ['meatball'], 'Meatloaf': ['ground beef'], 'Salisbury steak': ['beef burger patty'], 'Cheesesteak': ['beef steak', 'bread'],
    'Pork chop': ['pork chop'], 'Bacon': ['bacon'], 'Sausage': ['pork sausage'], 'Bratwurst': ['pork sausage'],
    'Salmon': ['salmon'], 'Grilled salmon': ['salmon'], 'Fish and chips': ['fried battered fish', 'fries'], 'Fish fingers': ['fish sticks'], 'Fish stick': ['fish sticks'],
    'Shrimp': ['shrimp'], 'Tempura': ['shrimp', 'calamari'], 'Calamari': ['calamari'], 'Fried calamari': ['calamari'], 'Moules-frites': ['mussels', 'fries'],
    'Yakitori': ['chicken thigh'], 'Yakiniku': ['beef steak'], 'Teriyaki': ['chicken thigh'], 'Poke': ['salmon', 'white rice'],
    'Burrito': ['burrito'], 'Breakfast burrito': ['burrito'], 'Mission burrito': ['burrito'], 'Taco': ['taco'], 'Quesadilla': ['tortilla wrap', 'cheddar'],
    'Enchilada': ['burrito'], 'Fajita': ['tortilla wrap', 'chicken breast'], 'Guacamole': ['guacamole'],
    'Gyro': ['gyro', 'doner'], 'Shawarma': ['shoarma', 'gyro'], 'Döner kebab': ['gyro', 'doner'], 'Doner kebab': ['gyro', 'doner'], 'Kebab': ['gyro'],
    'Falafel': ['falafel'], 'Hummus': ['hummus'], 'Meze': ['hummus', 'falafel'], 'Tzatziki': ['tzatziki'], 'Pita': ['pita'],
    'Club sandwich': ['ham cheese sandwich'], 'Grilled cheese sandwich': ['grilled cheese sandwich', 'tosti'], 'Toast Hawaii': ['tosti'], 'Croque monsieur': ['tosti'],
    'Peanut butter and jelly sandwich': ['peanut butter', 'white bread'], 'Submarine sandwich': ['ham cheese sub'], 'Sandwich': ['ham cheese sandwich'],
    'BLT': ['bacon', 'white bread'], 'Reuben sandwich': ['ham cheese sandwich'], 'Steak sandwich': ['beef steak', 'baguette'], 'Bagel': ['bagel'],
    'Tomato soup': ['tomato soup'], 'Minestrone': ['tomato soup'], 'Miso soup': ['tofu'], 'Pea soup': ['erwtensoep'],
    'Porridge': ['oatmeal porridge'], 'Oatmeal': ['oatmeal porridge'], 'Muesli': ['muesli'], 'Granola': ['granola'], 'Yogurt': ['yoghurt'],
    'Dumpling': ['dumpling', 'spring roll'], 'Gyoza': ['spring roll'], 'Samosa': ['spring roll'], 'Spring rolls': ['spring roll'],
    'Popcorn': ['popcorn'], 'Pretzel': ['pretzels'], 'Chocolate': ['milk chocolate'], 'Fudge': ['milk chocolate'], 'Marzipan': ['marzipan'],
    'Banana': ['banana'], 'Apple': ['apple raw'], 'Frozen banana': ['banana'], 'Banana pudding': ['banana', 'custard'], 'Bananas Foster': ['banana', 'ice cream'],
    'Smoothie': ['smoothie'], 'Milkshake': ['milkshake'], 'Hot chocolate': ['hot chocolate'], 'Cappuccino': ['cappuccino'], 'Latte': ['latte'], 'Espresso': ['espresso']
  };
  // Keyword rules for the ~2000 classes that aren't listed explicitly.
  var RULES = [
    [/pizza/i, ['pizza']], [/cheeseburger/i, ['cheeseburger']], [/burger/i, ['burger']], [/hot dog/i, ['hot dog']],
    [/sushi|maki|nigiri/i, ['sushi']], [/fried rice|nasi/i, ['fried rice']], [/rice/i, ['white rice cooked']],
    [/noodle|ramen|udon|soba|mein|mee /i, ['egg noodles']], [/spaghetti|pasta|penne|linguine|fettuccine|tagliatelle|macaroni|rigatoni/i, ['pasta cooked']],
    [/salad/i, ['garden salad']], [/soup|broth|chowder/i, ['tomato soup', 'chicken noodle soup']], [/curry|masala|korma/i, ['chicken curry']],
    [/pancake|crêpe|crepe|blini/i, ['pancake', 'crepe']], [/waffle/i, ['waffle']], [/pie|tart/i, ['apple pie']], [/cheesecake/i, ['cheesecake']],
    [/cake|torte|gateau/i, ['chocolate cake', 'pound cake']], [/cookie|biscuit/i, ['cookie']], [/doughnut|donut|beignet|berliner/i, ['doughnut']],
    [/ice cream|gelato|sundae/i, ['ice cream']], [/pudding|custard|flan/i, ['custard', 'pudding']], [/omelet|frittata|tortilla española/i, ['omelet']],
    [/egg/i, ['egg']], [/fries|chips/i, ['fries']], [/potato/i, ['potatoes boiled', 'potato baked']], [/chicken/i, ['chicken breast', 'chicken thigh']],
    [/beef|steak|brisket/i, ['beef steak', 'ground beef']], [/pork|ham\b/i, ['pork']], [/sausage|wurst/i, ['pork sausage', 'frankfurter']],
    [/fish|cod|haddock/i, ['cod', 'fried battered fish']], [/salmon/i, ['salmon']], [/tuna/i, ['tuna']], [/shrimp|prawn/i, ['shrimp']],
    [/burrito|wrap/i, ['burrito', 'tortilla wrap']], [/taco/i, ['taco']], [/kebab|shawarma|gyro/i, ['gyro']], [/sandwich|sub\b|panini/i, ['ham cheese sandwich']],
    [/bread|loaf|bun\b|roll\b/i, ['bread']], [/dumpling|gyoza|momo|pierogi/i, ['dumpling', 'spring roll']], [/stew|goulash|ragout/i, ['hachee']],
    [/bean/i, ['beans']], [/lentil|dal\b|dhal/i, ['lentils']], [/tofu/i, ['tofu']], [/chocolate/i, ['milk chocolate']], [/yogh?urt/i, ['yoghurt']]
  ];

  var session = null, labels = null, loading = null;

  function fetchWithProgress(url, onBytes) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + url.split('/').pop());
      if (!r.body || !r.body.getReader) return r.arrayBuffer().then(function (b) { onBytes(b.byteLength); return b; });
      var reader = r.body.getReader(), chunks = [], got = 0;
      function pump() {
        return reader.read().then(function (res) {
          if (res.done) {
            var out = new Uint8Array(got), off = 0;
            chunks.forEach(function (c) { out.set(c, off); off += c.length; });
            return out.buffer;
          }
          chunks.push(res.value); got += res.value.length; onBytes(res.value.length);
          return pump();
        });
      }
      return pump();
    });
  }
  function loadScript(src) {
    return new Promise(function (res, rej) {
      if (window.ort) return res();
      var s = document.createElement('script'); s.src = src; s.onload = res;
      s.onerror = function () { rej(new Error('Could not load ' + src.split('/').pop())); };
      document.head.appendChild(s);
    });
  }

  // onProgress(fraction 0..1, message)
  function load(onProgress) {
    if (session) return Promise.resolve();
    if (loading) return loading;
    onProgress = onProgress || function () {};
    var TOTAL = 14239897 + 10663722 + 60000; // approx bytes (wasm + model + labels) for the progress bar
    var done = 0;
    var tick = function (n) { done += n; onProgress(Math.min(0.99, done / TOTAL), 'Downloading recognition model… ' + (done / 1048576).toFixed(1) + ' / ' + (TOTAL / 1048576).toFixed(0) + ' MB'); };
    onProgress(0, 'Loading recognition engine…');
    loading = loadScript(FILES.ort).then(function () {
      return Promise.all([fetchWithProgress(FILES.wasm, tick), fetchWithProgress(FILES.model, tick),
        fetch(FILES.labels).then(function (r) { if (!r.ok) throw new Error('labels HTTP ' + r.status); return r.json(); })]);
    }).then(function (res) {
      labels = res[2];
      var ort = window.ort;
      ort.env.wasm.numThreads = 1;          // no SharedArrayBuffer needed (works on any static host)
      ort.env.wasm.proxy = false;
      ort.env.wasm.wasmBinary = res[0];      // already downloaded (with progress) -> no second fetch
      ort.env.wasm.wasmPaths = { mjs: FILES.mjs, wasm: FILES.wasm };
      ort.env.logLevel = 'error';
      onProgress(0.995, 'Starting model…');
      return ort.InferenceSession.create(res[1], { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
    }).then(function (s) { session = s; onProgress(1, 'Model ready'); })
      .catch(function (e) { loading = null; throw e; });
    return loading;
  }

  // Center-crop to a square and resize to 192x192 in two steps for better downscaling quality.
  function preprocess(img) {
    var w = img.naturalWidth || img.videoWidth || img.width, h = img.naturalHeight || img.videoHeight || img.height;
    var s = Math.min(w, h), sx = (w - s) / 2, sy = (h - s) / 2;
    var mid = document.createElement('canvas'); var m = Math.min(s, 384); mid.width = mid.height = m;
    var mc = mid.getContext('2d'); mc.imageSmoothingEnabled = true; mc.imageSmoothingQuality = 'high';
    mc.drawImage(img, sx, sy, s, s, 0, 0, m, m);
    var c = document.createElement('canvas'); c.width = c.height = SIZE;
    var ctx = c.getContext('2d', { willReadFrequently: true }); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(mid, 0, 0, m, m, 0, 0, SIZE, SIZE);
    var px = ctx.getImageData(0, 0, SIZE, SIZE).data, n = SIZE * SIZE, f = new Float32Array(3 * n);
    for (var i = 0; i < n; i++) { // NCHW, (v - 128) / 128  (matches the original uint8 model's quantization)
      f[i] = (px[i * 4] - 128) / 128; f[n + i] = (px[i * 4 + 1] - 128) / 128; f[2 * n + i] = (px[i * 4 + 2] - 128) / 128;
    }
    return f;
  }

  // Returns {top:[{label, p}], background: p, ms}
  function classify(img, k) {
    if (!session) return Promise.reject(new Error('Model not loaded'));
    var t0 = performance.now();
    var input = new window.ort.Tensor('float32', preprocess(img), [1, 3, SIZE, SIZE]);
    return session.run({ input: input }).then(function (out) {
      var p = out.probs.data, idx = [];
      for (var i = 1; i < p.length; i++) if (labels[i]) idx.push(i);
      idx.sort(function (a, b) { return p[b] - p[a]; });
      return { top: idx.slice(0, k || 5).map(function (i) { return { label: labels[i], p: p[i] }; }), background: p[0], ms: Math.round(performance.now() - t0) };
    });
  }

  function searchTerms(label) {
    var terms = (MAP[label] || []).slice();
    RULES.forEach(function (r) { if (r[0].test(label)) terms = terms.concat(r[1]); });
    terms.push(label.toLowerCase().replace(/[-–]/g, ' ').replace(/\(.*?\)/g, ''));
    var STOP = ['style', 'with', 'sauce', 'dish', 'homemade', 'traditional', 'special'];
    label.split(/[\s,-]+/).filter(function (w) { return w.length >= 4 && STOP.indexOf(w.toLowerCase()) < 0; }).sort(function (a, b) { return b.length - a.length; })
      .forEach(function (w) { terms.push(w.toLowerCase()); });
    return terms.filter(function (t, i, a) { return t && a.indexOf(t) === i; });
  }

  window.FoodPhoto = { load: load, classify: classify, searchTerms: searchTerms, isLoaded: function () { return !!session; }, MAP: MAP, RULES: RULES, FILES: FILES };
})();
