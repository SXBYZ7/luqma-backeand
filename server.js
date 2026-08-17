const express = require("express");
const multer = require("multer");
const OpenAI = require("openai");

const app = express();

app.use(express.json({ limit: "2mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

const PORT = process.env.PORT || 3000;

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


/* =========================
   الصفحة الرئيسية
========================= */

app.get("/", (req, res) => {

  res.json({
    app: "لُقمة",
    version: "V2",
    status: "online",
    message: "Backend يعمل بنجاح ✅"
  });

});


/* =========================
   اختبار السيرفر
========================= */

app.get("/api/test", (req, res) => {

  res.json({
    success: true,
    message: "لُقمة Backend يعمل بشكل صحيح 🚀"
  });

});


/* =========================
   دالة الذكاء الاصطناعي
========================= */

async function askAI(prompt, imageBase64 = null) {

  const content = [
    {
      type: "input_text",
      text: prompt
    }
  ];


  if (imageBase64) {

    content.push({
      type: "input_image",
      image_url: `data:image/jpeg;base64,${imageBase64}`
    });

  }


  const response = await client.responses.create({

    model: process.env.OPENAI_MODEL || "gpt-5.6",

    input: [
      {
        role: "user",
        content: content
      }
    ]

  });


  return response.output_text;

}


/* =========================
   تنظيف JSON
========================= */

function cleanJSON(text) {

  let result = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();


  const start = result.indexOf("{");
  const end = result.lastIndexOf("}");


  if (start !== -1 && end !== -1) {

    result =
      result.substring(
        start,
        end + 1
      );

  }


  return JSON.parse(result);

}


/* =========================
   إنشاء وصفة من المكونات
========================= */

app.post("/api/recipe", async (req, res) => {

  try {

    const ingredients =
      req.body.ingredients;


    if (!ingredients) {

      return res.status(400).json({
        error: "اكتب المكونات أولًا"
      });

    }


    const prompt = `

أنت الذكاء الاصطناعي الخاص بتطبيق "لُقمة".

المستخدم لديه هذه المكونات:

${ingredients}


أنشئ له وصفة مناسبة ولذيذة.

احسب السعرات والقيم الغذائية بشكل تقريبي.

أريد النتيجة JSON فقط بدون أي كلام خارج JSON.

استخدم هذا الشكل بالضبط:

{
  "title": "اسم الوصفة",
  "calories": 500,
  "macros": {
    "protein": 30,
    "carbs": 50,
    "fat": 15
  },
  "ingredients": [
    {
      "name": "اسم المكون",
      "amount": "الكمية"
    }
  ],
  "steps": [
    "الخطوة الأولى",
    "الخطوة الثانية",
    "الخطوة الثالثة"
  ]
}

إذا لم تكن الكمية معروفة، استخدم تقديرًا منطقيًا واعتبر السعرات تقريبية.

`;


    const result =
      await askAI(prompt);


    const data =
      cleanJSON(result);


    res.json(data);


  } catch (error) {

    console.error(error);

    res.status(500).json({

      error:
        "حدث خطأ أثناء إنشاء الوصفة"

    });

  }

});


/* =========================
   تحليل صورة الوجبة
========================= */

app.post(
  "/api/analyze-image",
  upload.single("image"),
  async (req, res) => {

    try {

      if (!req.file) {

        return res.status(400).json({
          error: "لم يتم إرسال صورة"
        });

      }


      const imageBase64 =
        req.file.buffer.toString("base64");


      const prompt = `

أنت الذكاء الاصطناعي الخاص بتطبيق "لُقمة".

حلل صورة الطعام المرفقة.

حاول التعرف على:

1. جميع الأطعمة الموجودة.
2. الكمية التقريبية لكل طعام.
3. السعرات لكل مكون.
4. مجموع السعرات.
5. البروتين.
6. الكربوهيدرات.
7. الدهون.
8. اسم الوجبة.
9. طريقة التحضير إذا كان بالإمكان استنتاجها.

مهم جدًا:

الصورة لا تستطيع معرفة الوزن بدقة دائمًا.

لذلك استخدم تقديرات منطقية ولا تدّعي الدقة المطلقة.

أرجع JSON فقط بهذا الشكل:

{
  "title": "اسم الوجبة",
  "calories": 600,
  "macros": {
    "protein": 40,
    "carbs": 60,
    "fat": 20
  },
  "ingredients": [
    {
      "name": "دجاج",
      "amount": "150g"
    },
    {
      "name": "أرز",
      "amount": "200g"
    }
  ],
  "steps": [
    "خطوة التحضير إذا كانت معروفة"
  ]
}

لا تضع أي نص خارج JSON.

`;


      const result =
        await askAI(
          prompt,
          imageBase64
        );


      const data =
        cleanJSON(result);


      res.json(data);


    } catch (error) {

      console.error(error);

      res.status(500).json({

        error:
          "حدث خطأ أثناء تحليل الصورة"

      });

    }

  }
);


/* =========================
   تحليل نص وصفة
========================= */

app.post("/api/analyze-text", async (req, res) => {

  try {

    const text =
      req.body.text;


    if (!text) {

      return res.status(400).json({
        error: "لم يتم إرسال النص"
      });

    }


    const prompt = `

أنت ذكاء اصطناعي متخصص بالوصفات والتغذية.

حلل النص التالي:

${text}

استخرج الوصفة والمكونات والخطوات.

ثم قدر السعرات والقيم الغذائية.

أرجع JSON فقط:

{
  "title": "اسم الوصفة",
  "calories": 500,
  "macros": {
    "protein": 30,
    "carbs": 50,
    "fat": 15
  },
  "ingredients": [],
  "steps": []
}

`;


    const result =
      await askAI(prompt);


    const data =
      cleanJSON(result);


    res.json(data);


  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "حدث خطأ أثناء تحليل النص"
    });

  }

});


/* =========================
   تشغيل السيرفر
========================= */

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `Luqma Backend running on port ${PORT}`
    );

  }
);