const express = require("express");
const cors = require("cors");
const multer = require("multer");
const OpenAI = require("openai");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 8080;

/* =========================================================
   Middleware
========================================================= */

app.use(cors());

app.use(
  express.json({
    limit: "15mb"
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "15mb"
  })
);

/* =========================================================
   Static Files
   index.html + server.js + أي ملفات أخرى
========================================================= */

app.use(express.static(__dirname));

/* =========================================================
   Upload
========================================================= */

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

/* =========================================================
   OpenAI
========================================================= */

let openai = null;

if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

/* =========================================================
   HOME
========================================================= */

app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "index.html")
  );
});

/* =========================================================
   HEALTH
========================================================= */

app.get("/health", (req, res) => {
  res.json({
    success: true,
    app: "لُقمة",
    version: "V4",
    status: "online",
    port: PORT,
    openai:
      !!process.env.OPENAI_API_KEY
  });
});

/* =========================================================
   API TEST
========================================================= */

app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    app: "لُقمة",
    version: "V4",
    message: "Luqma API يعمل بشكل صحيح 🚀"
  });
});

/* =========================================================
   OPENAI CHECK
========================================================= */

function requireOpenAI(res) {

  if (
    !process.env.OPENAI_API_KEY ||
    !openai
  ) {

    res.status(500).json({
      success: false,
      error:
        "OPENAI_API_KEY غير موجود في Railway"
    });

    return false;
  }

  return true;
}

/* =========================================================
   AI FUNCTION
========================================================= */

async function askAI(
  prompt,
  imageData = null
) {

  if (!openai) {
    throw new Error(
      "OPENAI_API_KEY غير موجود"
    );
  }

  const content = [
    {
      type: "input_text",
      text: prompt
    }
  ];

  if (imageData) {

    content.push({
      type: "input_image",
      image_url: imageData
    });

  }

  const response =
    await openai.responses.create({

      model:
        process.env.OPENAI_MODEL ||
        "gpt-5.6",

      input: [
        {
          role: "user",
          content
        }
      ]

    });

  return response.output_text || "";
}

/* =========================================================
   JSON PARSER
========================================================= */

function parseJSON(text) {

  let clean =
    String(text || "")
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

  const first =
    clean.indexOf("{");

  const last =
    clean.lastIndexOf("}");

  if (
    first !== -1 &&
    last !== -1 &&
    last > first
  ) {

    clean =
      clean.substring(
        first,
        last + 1
      );
  }

  try {

    return JSON.parse(clean);

  } catch {

    throw new Error(
      "الذكاء الاصطناعي لم يرجع بيانات JSON صحيحة"
    );
  }
}

/* =========================================================
   تحليل صورة الوجبة
========================================================= */

app.post(
  "/api/analyze-image",
  upload.single("image"),
  async (req, res) => {

    try {

      if (!req.file) {

        return res.status(400).json({
          success: false,
          error:
            "لم يتم إرسال صورة"
        });

      }

      if (!requireOpenAI(res)) {
        return;
      }

      const mime =
        req.file.mimetype ||
        "image/jpeg";

      const base64 =
        req.file.buffer.toString(
          "base64"
        );

      const imageData =
        `data:${mime};base64,${base64}`;

      const prompt = `

أنت "لُقمة"، مساعد ذكي متخصص بالطعام والتغذية.

حلل صورة الوجبة.

حاول تحديد:

1. اسم الوجبة
2. جميع الأطعمة الظاهرة
3. الكمية التقريبية لكل عنصر
4. السعرات الحرارية
5. البروتين
6. الكربوهيدرات
7. الدهون
8. الألياف إن أمكن
9. المكونات
10. خطوات التحضير إذا أمكن استنتاجها

مهم جدًا:

الصورة لا تعطي الوزن الحقيقي بشكل مؤكد.

لذلك استخدم تقديرات منطقية.

لا تقل إن الأرقام دقيقة 100%.

أرجع JSON فقط بدون أي كلام خارجه.

استخدم:

{
  "title": "اسم الوجبة",
  "calories": 500,
  "macros": {
    "protein": 30,
    "carbs": 50,
    "fat": 15,
    "fiber": 5
  },
  "ingredients": [
    {
      "name": "دجاج",
      "amount": "150 غرام"
    }
  ],
  "steps": [
    "الخطوة الأولى",
    "الخطوة الثانية"
  ]
}

`;

      const result =
        await askAI(
          prompt,
          imageData
        );

      const data =
        parseJSON(result);

      res.json({
        success: true,
        ...data
      });

    } catch (error) {

      console.error(
        "IMAGE ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          error?.message ||
          "حدث خطأ أثناء تحليل الصورة"
      });
    }
  }
);

/* =========================================================
   تحليل نص
========================================================= */

app.post(
  "/api/analyze-text",
  async (req, res) => {

    try {

      const text =
        req.body?.text;

      if (!text) {

        return res.status(400).json({
          success: false,
          error:
            "لم يتم إرسال النص"
        });

      }

      if (!requireOpenAI(res)) {
        return;
      }

      const prompt = `

أنت "لُقمة"، مساعد ذكي متخصص بالوصفات والتغذية.

حلل النص التالي:

${text}

استخرج:

- اسم الوصفة
- المكونات
- الكميات
- طريقة التحضير
- السعرات
- البروتين
- الكارب
- الدهون
- الألياف إن أمكن

أرجع JSON فقط:

{
  "title": "اسم الوصفة",
  "calories": 500,
  "macros": {
    "protein": 30,
    "carbs": 50,
    "fat": 15,
    "fiber": 5
  },
  "ingredients": [
    {
      "name": "اسم المكون",
      "amount": "الكمية"
    }
  ],
  "steps": [
    "الخطوة الأولى",
    "الخطوة الثانية"
  ]
}

`;

      const result =
        await askAI(prompt);

      const data =
        parseJSON(result);

      res.json({
        success: true,
        ...data
      });

    } catch (error) {

      console.error(
        "TEXT ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          error?.message ||
          "حدث خطأ أثناء تحليل النص"
      });
    }
  }
);

/* =========================================================
   استخراج وصفة من رابط TikTok / Instagram
========================================================= */

app.post(
  "/api/extract-recipe",
  async (req, res) => {

    try {

      const url =
        String(
          req.body?.url || ""
        ).trim();

      if (!url) {

        return res.status(400).json({
          success: false,
          error:
            "لم يتم إرسال رابط"
        });

      }

      const isTikTok =
        /tiktok\.com/i.test(url);

      const isInstagram =
        /instagram\.com/i.test(url);

      if (
        !isTikTok &&
        !isInstagram
      ) {

        return res.status(400).json({
          success: false,
          error:
            "الرابط يجب أن يكون من TikTok أو Instagram"
        });

      }

      if (!requireOpenAI(res)) {
        return;
      }

      /*
       * ملاحظة:
       * OpenAI هنا لا يستطيع تلقائيًا مشاهدة
       * فيديو TikTok/Instagram بمجرد إعطائه الرابط.
       *
       * لذلك نستخدم الرابط كمعلومة مصدر،
       * ونطلب من النموذج عدم اختراع تفاصيل
       * غير موجودة.
       *
       * يمكن لاحقًا إضافة خدمة استخراج فيديو/نص
       * حقيقية لهذه الميزة.
       */

      const prompt = `

أنت مساعد التغذية في تطبيق "لُقمة".

المستخدم أعطاك رابط وصفة من:
${isTikTok ? "TikTok" : "Instagram"}

الرابط:
${url}

مهم جدًا:

لا تدّعي أنك شاهدت الفيديو إذا لم يكن
محتوى الفيديو أو نصه متاحًا لك.

إذا لم تتوفر معلومات الوصفة من الرابط،
أرجع JSON يحتوي على:

{
  "title": "تعذر استخراج الوصفة",
  "calories": 0,
  "macros": {
    "protein": 0,
    "carbs": 0,
    "fat": 0,
    "fiber": 0
  },
  "ingredients": [],
  "steps": [],
  "source": "${url}",
  "needsContent": true,
  "message": "نحتاج نص الوصفة أو محتوى الفيديو لتحليلها بدقة."
}

ولا تخترع مكونات أو سعرات.

إذا كان محتوى الوصفة متوفرًا ضمن المدخل،
حلله وأرجع:

{
  "title": "اسم الوصفة",
  "calories": 500,
  "macros": {
    "protein": 30,
    "carbs": 50,
    "fat": 15,
    "fiber": 5
  },
  "ingredients": [
    {
      "name": "اسم المكون",
      "amount": "الكمية"
    }
  ],
  "steps": [
    "الخطوة الأولى",
    "الخطوة الثانية"
  ],
  "source": "${url}",
  "needsContent": false
}

أرجع JSON فقط.

`;

      const result =
        await askAI(prompt);

      const data =
        parseJSON(result);

      res.json({
        success: true,
        ...data,
        source:
          data.source || url
      });

    } catch (error) {

      console.error(
        "EXTRACT ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          error?.message ||
          "حدث خطأ أثناء استخراج الوصفة"
      });
    }
  }
);

/* =========================================================
   إنشاء وصفة من مكونات
========================================================= */

app.post(
  "/api/recipe",
  async (req, res) => {

    try {

      const ingredients =
        req.body?.ingredients;

      if (!ingredients) {

        return res.status(400).json({
          success: false,
          error:
            "لم يتم إرسال المكونات"
        });

      }

      if (!requireOpenAI(res)) {
        return;
      }

      const prompt = `

أنت شيف وخبير تغذية في تطبيق "لُقمة".

المكونات:

${ingredients}

أنشئ وصفة مناسبة.

احسب بشكل تقريبي:

- السعرات
- البروتين
- الكارب
- الدهون
- الألياف

أرجع JSON فقط:

{
  "title": "اسم الوصفة",
  "calories": 500,
  "macros": {
    "protein": 30,
    "carbs": 50,
    "fat": 15,
    "fiber": 5
  },
  "ingredients": [
    {
      "name": "اسم المكون",
      "amount": "الكمية"
    }
  ],
  "steps": [
    "الخطوة الأولى",
    "الخطوة الثانية"
  ]
}

`;

      const result =
        await askAI(prompt);

      const data =
        parseJSON(result);

      res.json({
        success: true,
        ...data
      });

    } catch (error) {

      console.error(
        "RECIPE ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          error?.message ||
          "حدث خطأ أثناء إنشاء الوصفة"
      });
    }
  }
);

/* =========================================================
   404 API
========================================================= */

app.use(
  "/api",
  (req, res) => {

    res.status(404).json({
      success: false,
      error:
        "API endpoint غير موجود"
    });

  }
);

/* =========================================================
   تشغيل السيرفر
========================================================= */

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `Luqma Backend V4 running on port ${PORT}`
    );

  }
);