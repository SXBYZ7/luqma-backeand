const express = require("express");
const cors = require("cors");
const multer = require("multer");
const OpenAI = require("openai");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 8080;


/* =========================================
   Middleware
========================================= */

app.use(cors());

app.use(
  express.json({
    limit: "10mb"
  })
);


/* =========================================
   عرض ملفات الموقع
========================================= */

app.use(
  express.static(
    path.join(__dirname)
  )
);


/* =========================================
   رفع الصور
========================================= */

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024
  }
});


/* =========================================
   OpenAI
========================================= */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


/* =========================================
   الصفحة الرئيسية
========================================= */

app.get("/", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "index.html"
    )
  );

});


/* =========================================
   Health
========================================= */

app.get("/health", (req, res) => {

  res.json({

    status: "online",

    app: "Luqma",

    version: "11.0",

    openai:
      !!process.env.OPENAI_API_KEY

  });

});


/* =========================================
   اختبار API
========================================= */

app.get("/api/test", (req, res) => {

  res.json({

    success: true,

    app: "Luqma",

    message:
      "Luqma API يعمل بنجاح 🚀",

    version: "11.0"

  });

});


/* =========================================
   دالة استخراج JSON
========================================= */

function extractJSON(text) {

  let clean =
    String(text || "")
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();


  const start =
    clean.indexOf("{");


  const end =
    clean.lastIndexOf("}");


  if (
    start === -1 ||
    end === -1
  ) {

    throw new Error(
      "الذكاء الاصطناعي لم يرجع JSON صحيح"
    );

  }


  clean =
    clean.substring(
      start,
      end + 1
    );


  return JSON.parse(clean);

}


/* =========================================
   تحليل صورة الوجبة
========================================= */

app.post(
  "/api/analyze-image",

  upload.single("image"),

  async (req, res) => {

    try {

      /* -------------------------
         التحقق من الصورة
      ------------------------- */

      if (!req.file) {

        return res.status(400).json({

          success: false,

          error:
            "لم يتم إرسال صورة"

        });

      }


      /* -------------------------
         التحقق من المفتاح
      ------------------------- */

      if (
        !process.env.OPENAI_API_KEY
      ) {

        return res.status(500).json({

          success: false,

          error:
            "OPENAI_API_KEY غير موجود في Railway"

        });

      }


      /* -------------------------
         تحويل الصورة
      ------------------------- */

      const base64 =
        req.file.buffer.toString(
          "base64"
        );


      const mime =
        req.file.mimetype ||
        "image/jpeg";


      const imageUrl =
        `data:${mime};base64,${base64}`;


      /* -------------------------
         الذكاء الاصطناعي
      ------------------------- */

      const response =
        await openai.responses.create({

          model:
            process.env.OPENAI_MODEL ||
            "gpt-5.6",

          input: [

            {

              role: "user",

              content: [

                {

                  type:
                    "input_text",

                  text: `

أنت "لُقمة"، مساعد ذكاء اصطناعي متخصص بالطعام والتغذية.

حلل صورة الوجبة المرفقة.

حاول تحديد:

1. اسم الوجبة
2. الأطعمة الموجودة
3. الكمية التقريبية
4. السعرات الحرارية
5. البروتين
6. الكربوهيدرات
7. الدهون
8. الألياف
9. المكونات
10. خطوات التحضير إذا أمكن

مهم جداً:

الصورة لا تستطيع تحديد الوزن الحقيقي بدقة.

لذلك استخدم تقديرات معقولة ولا تدّعي أن الأرقام دقيقة 100%.

أرجع JSON فقط.

استخدم هذا الشكل:

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

إذا كان شيء غير واضح في الصورة، اعتبره تقديراً.

`

                },

                {

                  type:
                    "input_image",

                  image_url:
                    imageUrl

                }

              ]

            }

          ]

        });


      /* -------------------------
         قراءة النتيجة
      ------------------------- */

      const output =
        response.output_text || "";


      const data =
        extractJSON(output);


      /* -------------------------
         إرسال النتيجة
      ------------------------- */

      res.json({

        success: true,

        data: data

      });

    }

    catch (error) {

      console.error(
        "IMAGE ERROR:",
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


/* =========================================
   تحليل النص
========================================= */

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


      if (
        !process.env.OPENAI_API_KEY
      ) {

        return res.status(500).json({

          success: false,

          error:
            "OPENAI_API_KEY غير موجود"

        });

      }


      const response =
        await openai.responses.create({

          model:
            process.env.OPENAI_MODEL ||
            "gpt-5.6",

          input: `

أنت "لُقمة"، مساعد متخصص بالطعام والتغذية.

حلل وصف الوجبة التالي:

${text}

احسب تقديراً للسعرات والقيم الغذائية.

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


      const data =
        extractJSON(
          response.output_text
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


/* =========================================
   إنشاء وصفة
========================================= */

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


      const response =
        await openai.responses.create({

          model:
            process.env.OPENAI_MODEL ||
            "gpt-5.6",

          input: `

أنت شيف وخبير تغذية في تطبيق "لُقمة".

المكونات:

${ingredients}

أنشئ وصفة مناسبة من هذه المكونات.

احسب السعرات والقيم الغذائية تقريبياً.

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


      const data =
        extractJSON(
          response.output_text
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


/* =========================================
   تشغيل السيرفر
========================================= */

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `Luqma V11 running on port ${PORT}`
    );

  }
);