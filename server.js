const express = require("express");
const cors = require("cors");
const multer = require("multer");
const OpenAI = require("openai");

const app = express();

const PORT = process.env.PORT || 8080;

/* ================================
   Middleware
================================ */

app.use(cors());

app.use(express.json({
  limit: "15mb"
}));

app.use(express.urlencoded({
  extended: true,
  limit: "15mb"
}));

/* ================================
   Upload
================================ */

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

/* ================================
   OpenAI
================================ */

let ai = null;

if (process.env.OPENAI_API_KEY) {

  ai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

}

/* ================================
   الصفحة الرئيسية
================================ */

app.get("/", (req, res) => {

  res.send("LUQMA V7 WORKING ✅");

});

/* ================================
   Health
================================ */

app.get("/health", (req, res) => {

  res.json({
    success: true,
    app: "Luqma",
    version: "V7",
    status: "online",
    openai: !!ai
  });

});

/* ================================
   API Test
================================ */

app.get("/api/test", (req, res) => {

  res.json({
    success: true,
    message: "Luqma API يعمل ✅"
  });

});

/* ================================
   تحليل صورة
================================ */

app.post(
  "/api/analyze-image",
  upload.single("image"),
  async (req, res) => {

    try {

      /* التأكد من الصورة */

      if (!req.file) {

        return res.status(400).json({
          success: false,
          error: "لم يتم إرسال صورة"
        });

      }

      /* التأكد من مفتاح OpenAI */

      if (!ai) {

        return res.status(500).json({
          success: false,
          error:
            "OPENAI_API_KEY غير موجود في Railway"
        });

      }

      /* تحويل الصورة */

      const base64 =
        req.file.buffer.toString("base64");

      const mime =
        req.file.mimetype || "image/jpeg";

      const image =
        `data:${mime};base64,${base64}`;

      /* طلب التحليل */

      const response =
        await ai.responses.create({

          model:
            process.env.OPENAI_MODEL ||
            "gpt-5.6",

          input: [

            {
              role: "user",

              content: [

                {
                  type: "input_text",

                  text: `

أنت "لُقمة"، مساعد ذكي متخصص بالطعام والتغذية.

حلل صورة الطعام المرفقة.

حدد قدر الإمكان:

- اسم الوجبة
- الأطعمة الموجودة
- الكمية التقريبية
- السعرات الحرارية
- البروتين
- الكربوهيدرات
- الدهون
- الألياف
- المكونات
- طريقة التحضير إن أمكن استنتاجها

مهم:

الصورة لا تسمح بمعرفة الوزن الحقيقي بدقة.

لذلك استخدم تقديرات معقولة.

لا تدّعي أن الأرقام دقيقة 100%.

أرجع JSON فقط بدون أي كلام خارجه.

الشكل المطلوب:

{
  "title": "اسم الوجبة",
  "calories": 500,
  "protein": 30,
  "carbs": 50,
  "fat": 15,
  "fiber": 5,
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

`
                },

                {
                  type: "input_image",

                  image_url: image
                }

              ]

            }

          ]

        });

      /* استخراج النص */

      let text =
        response.output_text || "";

      text =
        text
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();

      /* العثور على JSON */

      const first =
        text.indexOf("{");

      const last =
        text.lastIndexOf("}");

      if (
        first === -1 ||
        last === -1
      ) {

        throw new Error(
          "الذكاء الاصطناعي لم يرجع JSON صحيح"
        );

      }

      const jsonText =
        text.substring(
          first,
          last + 1
        );

      const data =
        JSON.parse(jsonText);

      /* إرسال النتيجة */

      res.json({

        success: true,

        data: data

      });

    }

    catch (error) {

      console.error(
        "IMAGE ANALYSIS ERROR:",
        error
      );

      res.status(500).json({

        success: false,

        error:
          error.message ||
          "حدث خطأ أثناء تحليل الصورة"

      });

    }

  }
);

/* ================================
   تحليل نص وجبة
================================ */

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
            "لم يتم إرسال نص الوجبة"

        });

      }

      if (!ai) {

        return res.status(500).json({

          success: false,

          error:
            "OPENAI_API_KEY غير موجود"

        });

      }

      const response =
        await ai.responses.create({

          model:
            process.env.OPENAI_MODEL ||
            "gpt-5.6",

          input: `

أنت "لُقمة"، خبير تغذية.

حلل الوجبة التالية:

${text}

أرجع JSON فقط:

{
  "title": "اسم الوجبة",
  "calories": 500,
  "protein": 30,
  "carbs": 50,
  "fat": 15,
  "fiber": 5,
  "ingredients": [],
  "steps": []
}

`

        });

      let result =
        response.output_text || "";

      result =
        result
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();

      const first =
        result.indexOf("{");

      const last =
        result.lastIndexOf("}");

      const data =
        JSON.parse(
          result.substring(
            first,
            last + 1
          )
        );

      res.json({

        success: true,

        data: data

      });

    }

    catch (error) {

      console.error(
        "TEXT ERROR:",
        error
      );

      res.status(500).json({

        success: false,

        error:
          error.message ||
          "حدث خطأ أثناء تحليل النص"

      });

    }

  }
);

/* ================================
   إنشاء وصفة
================================ */

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

      if (!ai) {

        return res.status(500).json({

          success: false,

          error:
            "OPENAI_API_KEY غير موجود"

        });

      }

      const response =
        await ai.responses.create({

          model:
            process.env.OPENAI_MODEL ||
            "gpt-5.6",

          input: `

أنت شيف وخبير تغذية في تطبيق "لُقمة".

المكونات:

${ingredients}

أنشئ وصفة مناسبة.

أرجع JSON فقط:

{
  "title": "اسم الوصفة",
  "calories": 500,
  "protein": 30,
  "carbs": 50,
  "fat": 15,
  "fiber": 5,
  "ingredients": [],
  "steps": []
}

`

        });

      let result =
        response.output_text || "";

      result =
        result
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();

      const first =
        result.indexOf("{");

      const last =
        result.lastIndexOf("}");

      const data =
        JSON.parse(
          result.substring(
            first,
            last + 1
          )
        );

      res.json({

        success: true,

        data: data

      });

    }

    catch (error) {

      console.error(
        "RECIPE ERROR:",
        error
      );

      res.status(500).json({

        success: false,

        error:
          error.message ||
          "حدث خطأ أثناء إنشاء الوصفة"

      });

    }

  }
);

/* ================================
   تشغيل السيرفر
================================ */

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `LUQMA V7 RUNNING ON PORT ${PORT}`
    );

  }
);