import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PptxGenJS from "pptxgenjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const screenshotDir = path.join(projectRoot, ".tmp", "ppt-screenshots");
const deliverableDir = path.join(projectRoot, "deliverables");
const assetOutDir = path.join(deliverableDir, "employee-user-guide-assets");
const pptxPath = path.join(deliverableDir, "employee-user-guide.pptx");

const COLORS = {
  bg: "F6F8FB",
  ink: "111827",
  muted: "5B6475",
  line: "D7DDEA",
  card: "FFFFFF",
  brand: "0F766E",
  accent: "14B8A6",
  soft: "E6FFFB",
};

const screenshotFiles = [
  "login.png",
  "dashboard.png",
  "leave-request.png",
  "overtime-request.png",
  "notifications.png",
  "request-history.png",
  "common-alert.png",
];

const slides = [
  {
    key: "login",
    titleZh: "系统入口与登录",
    titleTh: "ทางเข้าและการเข้าสู่ระบบ",
    image: "login.png",
    note: "截图来源：5175 正式环境登录页",
    steps: [
      {
        zh: "打开系统后，先输入账号和密码，再点击“进入系统”。",
        th: "เมื่อเปิดระบบแล้ว ให้กรอกชื่อผู้ใช้และรหัสผ่าน จากนั้นกด \"เข้าสู่ระบบ\"",
      },
      {
        zh: "如登录失败，请先确认账号是否正确、密码是否为最新。",
        th: "หากเข้าสู่ระบบไม่สำเร็จ ให้ตรวจสอบชื่อผู้ใช้และรหัสผ่านล่าสุดก่อน",
      },
      {
        zh: "首次使用建议先切换到自己熟悉的语言。",
        th: "ครั้งแรกที่ใช้งาน แนะนำให้สลับภาษาเป็นภาษาที่คุ้นเคยก่อน",
      },
    ],
  },
  {
    key: "dashboard",
    titleZh: "首页总览",
    titleTh: "ภาพรวมหน้าแรก",
    image: "dashboard.png",
    note: "截图来源：5176 预览环境员工首页",
    steps: [
      {
        zh: "首页可以快速看到打卡入口、消息提醒和待办信息。",
        th: "ที่หน้าแรกสามารถดูทางเข้าตอกบัตร ข้อความแจ้งเตือน และงานที่ต้องทำได้อย่างรวดเร็ว",
      },
      {
        zh: "有未读消息时，优先进入消息页查看审批结果或系统通知。",
        th: "หากมีข้อความที่ยังไม่ได้อ่าน ให้เข้าหน้าข้อความเพื่อตรวจสอบผลอนุมัติหรือประกาศจากระบบก่อน",
      },
      {
        zh: "常用操作都能从底部导航直接进入。",
        th: "เมนูด้านล่างสามารถเข้าฟังก์ชันที่ใช้งานบ่อยได้โดยตรง",
      },
    ],
  },
  {
    key: "leave",
    titleZh: "请假申请",
    titleTh: "การส่งคำขอลา",
    image: "leave-request.png",
    note: "截图来源：5176 预览环境请假页",
    steps: [
      {
        zh: "先选择请假类型，再填写开始时间、结束时间和请假原因。",
        th: "เลือกประเภทการลาก่อน แล้วกรอกเวลาเริ่มต้น เวลาสิ้นสุด และเหตุผลการลา",
      },
      {
        zh: "系统会显示当前可用带薪假天数，方便提交前先确认。",
        th: "ระบบจะแสดงจำนวนวันลาที่มีค่าจ้างคงเหลือ เพื่อให้ตรวจสอบก่อนส่งคำขอ",
      },
      {
        zh: "确认信息无误后点击“提交申请”。",
        th: "เมื่อข้อมูลถูกต้องแล้ว ให้กด \"ส่งคำขอ\"",
      },
    ],
  },
  {
    key: "overtime",
    titleZh: "加班申请",
    titleTh: "การส่งคำขอล่วงเวลา",
    image: "overtime-request.png",
    note: "截图来源：5176 预览环境加班页",
    steps: [
      {
        zh: "填写加班开始时间、结束时间和原因，必要时补充每小时加班费。",
        th: "กรอกเวลาเริ่มต้น เวลาสิ้นสุด และเหตุผลการล่วงเวลา หากจำเป็นให้ระบุค่าล่วงเวลาต่อชั่วโมง",
      },
      {
        zh: "页面会自动估算本次加班金额，提交前可先核对。",
        th: "หน้าจอจะคำนวณยอดค่าล่วงเวลาโดยประมาณให้อัตโนมัติ สามารถตรวจสอบก่อนส่งได้",
      },
      {
        zh: "提交后可在记录区查看当前状态。",
        th: "หลังส่งแล้ว สามารถตรวจสอบสถานะได้ในส่วนประวัติคำขอ",
      },
    ],
  },
  {
    key: "notifications",
    titleZh: "消息中心",
    titleTh: "ศูนย์ข้อความ",
    image: "notifications.png",
    note: "截图来源：5176 预览环境消息中心",
    steps: [
      {
        zh: "消息中心用于查看审批结果、系统通知和提醒。",
        th: "ศูนย์ข้อความใช้สำหรับดูผลอนุมัติ ประกาศจากระบบ และการแจ้งเตือนต่าง ๆ",
      },
      {
        zh: "点开消息后，可快速跳转到对应页面继续处理。",
        th: "เมื่อกดข้อความแล้ว สามารถไปยังหน้าที่เกี่ยวข้องเพื่อดำเนินการต่อได้ทันที",
      },
      {
        zh: "处理完成后可标记为已读，保持列表清晰。",
        th: "เมื่อจัดการแล้ว สามารถทำเครื่องหมายว่าอ่านแล้ว เพื่อให้รายการดูง่ายขึ้น",
      },
    ],
  },
  {
    key: "history",
    titleZh: "申请记录与状态",
    titleTh: "ประวัติคำขอและสถานะ",
    image: "request-history.png",
    note: "截图来源：5176 预览环境示例申请记录",
    steps: [
      {
        zh: "提交后的请假或加班申请会出现在记录列表中。",
        th: "หลังจากส่งคำขอลาหรือล่วงเวลาแล้ว รายการจะปรากฏในประวัติคำขอ",
      },
      {
        zh: "常见状态包括“待审批”“已通过”“已驳回”。",
        th: "สถานะที่พบบ่อย ได้แก่ \"รออนุมัติ\" \"อนุมัติแล้ว\" และ \"ไม่อนุมัติ\"",
      },
      {
        zh: "如有审批备注，可在记录卡片中一起查看。",
        th: "หากมีหมายเหตุจากผู้อนุมัติ จะสามารถดูได้ในบัตรรายการเดียวกัน",
      },
    ],
  },
  {
    key: "alert",
    titleZh: "常见提示与处理方式",
    titleTh: "ข้อความที่พบบ่อยและวิธีจัดการ",
    image: "common-alert.png",
    note: "截图来源：5176 预览环境状态示例",
    steps: [
      {
        zh: "看到“待审批”表示申请已成功提交，只需等待管理员处理。",
        th: "หากเห็นสถานะ \"รออนุมัติ\" แสดงว่าส่งคำขอสำเร็จแล้ว เพียงรอผู้ดูแลดำเนินการ",
      },
      {
        zh: "若长时间没有更新，可先刷新页面，再查看消息中心。",
        th: "หากสถานะไม่อัปเดตเป็นเวลานาน ให้รีเฟรชหน้า แล้วตรวจสอบที่ศูนย์ข้อความอีกครั้ง",
      },
      {
        zh: "遇到异常时，先截图保留页面，再联系管理员协助排查。",
        th: "เมื่อพบความผิดปกติ ให้จับภาพหน้าจอไว้ก่อน แล้วติดต่อผู้ดูแลเพื่อช่วยตรวจสอบ",
      },
    ],
  },
];

function screenshotPath(name) {
  return path.join(assetOutDir, name);
}

function readPngSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function imageSizingContain(filePath, x, y, w, h) {
  const { width, height } = readPngSize(filePath);
  const imageRatio = width / height;
  const boxRatio = w / h;

  if (imageRatio > boxRatio) {
    const fittedHeight = w / imageRatio;
    return {
      x,
      y: y + (h - fittedHeight) / 2,
      w,
      h: fittedHeight,
    };
  }

  const fittedWidth = h * imageRatio;
  return {
    x: x + (w - fittedWidth) / 2,
    y,
    w: fittedWidth,
    h,
  };
}

function imageSizingCrop(filePath, x, y, w, h) {
  const { width, height } = readPngSize(filePath);
  const imageRatio = width / height;
  const boxRatio = w / h;

  if (imageRatio > boxRatio) {
    const cropWidth = height * boxRatio;
    const xOffset = (width - cropWidth) / 2;
    return {
      x,
      y,
      w,
      h,
      path: filePath,
      srcRect: {
        x: xOffset,
        y: 0,
        w: cropWidth,
        h: height,
      },
    };
  }

  const cropHeight = width / boxRatio;
  const yOffset = (height - cropHeight) / 2;
  return {
    x,
    y,
    w,
    h,
    path: filePath,
    srcRect: {
      x: 0,
      y: yOffset,
      w: width,
      h: cropHeight,
    },
  };
}

function ensureDirectories() {
  fs.mkdirSync(deliverableDir, { recursive: true });
  fs.mkdirSync(assetOutDir, { recursive: true });
}

function copyAssets() {
  for (const file of screenshotFiles) {
    const src = path.join(screenshotDir, file);
    const dest = screenshotPath(file);
    fs.copyFileSync(src, dest);
  }
}

function addPageFrame(slide, pageLabel) {
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: 13.333,
    h: 7.5,
    line: { color: COLORS.bg, transparency: 100 },
    fill: { color: COLORS.bg },
  });

  slide.addShape("line", {
    x: 0.55,
    y: 1.02,
    w: 12.2,
    h: 0,
    line: { color: COLORS.line, pt: 1.2 },
  });

  slide.addText(pageLabel, {
    x: 11.95,
    y: 0.34,
    w: 0.7,
    h: 0.28,
    fontFace: "Segoe UI",
    fontSize: 9,
    color: COLORS.muted,
    align: "right",
    margin: 0,
  });
}

function addHeader(slide, titleZh, titleTh) {
  slide.addText(titleZh, {
    x: 0.58,
    y: 0.3,
    w: 5.6,
    h: 0.35,
    fontFace: "Microsoft YaHei",
    fontSize: 24,
    bold: true,
    color: COLORS.ink,
    margin: 0,
  });

  slide.addText(titleTh, {
    x: 0.58,
    y: 0.67,
    w: 5.6,
    h: 0.25,
    fontFace: "Segoe UI",
    fontSize: 11,
    color: COLORS.brand,
    margin: 0,
  });
}

function addFooter(slide, note) {
  slide.addText(note, {
    x: 0.58,
    y: 7.03,
    w: 6.4,
    h: 0.2,
    fontFace: "Segoe UI",
    fontSize: 8.5,
    color: COLORS.muted,
    margin: 0,
  });
}

function addScreenshotCard(slide, imagePath) {
  slide.addShape("roundRect", {
    x: 0.58,
    y: 1.28,
    w: 7.55,
    h: 5.45,
    rectRadius: 0.12,
    fill: { color: COLORS.card },
    line: { color: COLORS.line, pt: 1 },
    shadow: {
      type: "outer",
      color: "64748B",
      blur: 1,
      angle: 45,
      distance: 1,
      opacity: 0.12,
    },
  });

  slide.addImage({
    path: imagePath,
    ...imageSizingContain(imagePath, 0.78, 1.48, 7.15, 5.05),
  });
}

function addStepPanel(slide, items) {
  slide.addShape("roundRect", {
    x: 8.45,
    y: 1.28,
    w: 4.28,
    h: 5.45,
    rectRadius: 0.12,
    fill: { color: COLORS.card },
    line: { color: COLORS.line, pt: 1 },
  });

  slide.addText("操作要点 / จุดสำคัญ", {
    x: 8.72,
    y: 1.5,
    w: 2.8,
    h: 0.22,
    fontFace: "Segoe UI",
    fontSize: 11,
    bold: true,
    color: COLORS.brand,
    margin: 0,
  });

  const rowHeight = 1.48;
  items.forEach((item, index) => {
    const top = 1.9 + index * rowHeight;

    slide.addShape("ellipse", {
      x: 8.72,
      y: top,
      w: 0.36,
      h: 0.36,
      fill: { color: COLORS.soft },
      line: { color: COLORS.accent, pt: 1 },
    });

    slide.addText(String(index + 1), {
      x: 8.72,
      y: top + 0.03,
      w: 0.36,
      h: 0.2,
      fontFace: "Segoe UI",
      fontSize: 10,
      bold: true,
      color: COLORS.brand,
      align: "center",
      margin: 0,
    });

    slide.addText(item.zh, {
      x: 9.18,
      y: top - 0.02,
      w: 3.2,
      h: 0.54,
      fontFace: "Microsoft YaHei",
      fontSize: 11,
      bold: true,
      color: COLORS.ink,
      valign: "top",
      margin: 0,
    });

    slide.addText(item.th, {
      x: 9.18,
      y: top + 0.42,
      w: 3.2,
      h: 0.56,
      fontFace: "Segoe UI",
      fontSize: 9.5,
      color: COLORS.muted,
      valign: "top",
      margin: 0,
    });
  });
}

function buildCover(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.bg };

  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: 13.333,
    h: 7.5,
    fill: { color: "EDF8F7" },
    line: { color: "EDF8F7", transparency: 100 },
  });

  slide.addText("员工使用说明", {
    x: 0.72,
    y: 0.92,
    w: 4.6,
    h: 0.55,
    fontFace: "Microsoft YaHei",
    fontSize: 27,
    bold: true,
    color: COLORS.ink,
    margin: 0,
  });

  slide.addText("คู่มือการใช้งานสำหรับพนักงาน", {
    x: 0.72,
    y: 1.52,
    w: 4.9,
    h: 0.3,
    fontFace: "Segoe UI",
    fontSize: 14,
    color: COLORS.brand,
    margin: 0,
  });

  slide.addText("考勤、请假、加班、消息提醒与申请记录", {
    x: 0.72,
    y: 2.08,
    w: 4.4,
    h: 0.28,
    fontFace: "Microsoft YaHei",
    fontSize: 12,
    color: COLORS.muted,
    margin: 0,
  });

  slide.addText("ตอกบัตร การลา ล่วงเวลา ข้อความแจ้งเตือน และประวัติคำขอ", {
    x: 0.72,
    y: 2.4,
    w: 4.8,
    h: 0.28,
    fontFace: "Segoe UI",
    fontSize: 10,
    color: COLORS.muted,
    margin: 0,
  });

  const coverBullets = [
    "登录后优先查看首页和消息中心",
    "提交请假、加班后可在记录页追踪状态",
    "遇到异常时先截图，再联系管理员",
  ];
  const coverBulletsTh = [
    "หลังเข้าสู่ระบบให้ตรวจสอบหน้าแรกและศูนย์ข้อความก่อน",
    "หลังส่งคำขอลาหรือล่วงเวลา สามารถติดตามสถานะได้ที่หน้าประวัติ",
    "หากพบปัญหา ให้จับภาพหน้าจอก่อน แล้วติดต่อผู้ดูแล",
  ];

  coverBullets.forEach((item, index) => {
    const y = 3.08 + index * 1.02;
    slide.addShape("ellipse", {
      x: 0.78,
      y,
      w: 0.18,
      h: 0.18,
      fill: { color: COLORS.accent },
      line: { color: COLORS.accent, transparency: 100 },
    });
    slide.addText(item, {
      x: 1.05,
      y: y - 0.06,
      w: 4.4,
      h: 0.24,
      fontFace: "Microsoft YaHei",
      fontSize: 11.5,
      bold: true,
      color: COLORS.ink,
      margin: 0,
    });
    slide.addText(coverBulletsTh[index], {
      x: 1.05,
      y: y + 0.22,
      w: 4.4,
      h: 0.32,
      fontFace: "Segoe UI",
      fontSize: 9.5,
      color: COLORS.muted,
      margin: 0,
    });
  });

  const collage = [
    { file: "dashboard.png", x: 6.1, y: 0.7 },
    { file: "leave-request.png", x: 9.45, y: 0.7 },
    { file: "notifications.png", x: 6.1, y: 4.0 },
    { file: "request-history.png", x: 9.45, y: 4.0 },
  ];

  collage.forEach(item => {
    const imagePath = screenshotPath(item.file);
    slide.addShape("roundRect", {
      x: item.x,
      y: item.y,
      w: 3.0,
      h: 2.45,
      rectRadius: 0.08,
      fill: { color: COLORS.card },
      line: { color: COLORS.line, pt: 1 },
    });
    slide.addImage({
      path: imagePath,
      ...imageSizingContain(imagePath, item.x + 0.06, item.y + 0.06, 2.88, 2.33),
    });
  });

  slide.addText("截图环境：登录页取自 5175，业务页取自 5176 预览环境", {
    x: 0.72,
    y: 6.86,
    w: 6,
    h: 0.2,
    fontFace: "Segoe UI",
    fontSize: 8.5,
    color: COLORS.muted,
    margin: 0,
  });

}

function buildContentSlide(pptx, section, pageNumber, totalPages) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.bg };
  addPageFrame(slide, `${pageNumber}/${totalPages}`);
  addHeader(slide, section.titleZh, section.titleTh);
  addScreenshotCard(slide, screenshotPath(section.image));
  addStepPanel(slide, section.steps);
  addFooter(slide, section.note);
}

function buildContactSlide(pptx, pageNumber, totalPages) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.bg };
  addPageFrame(slide, `${pageNumber}/${totalPages}`);
  addHeader(slide, "联系管理员", "ติดต่อผู้ดูแลระบบ");

  slide.addShape("roundRect", {
    x: 0.58,
    y: 1.28,
    w: 5.35,
    h: 5.45,
    rectRadius: 0.12,
    fill: { color: COLORS.card },
    line: { color: COLORS.line, pt: 1 },
  });

  const tips = [
    {
      zh: "账号、权限、审批异常或数据问题，请联系管理员处理。",
      th: "หากพบปัญหาเรื่องบัญชี สิทธิ์ การอนุมัติ หรือข้อมูล ให้ติดต่อผู้ดูแลระบบ",
    },
    {
      zh: "反馈时建议附上页面截图、申请时间和问题描述。",
      th: "ตอนแจ้งปัญหา ควรแนบภาพหน้าจอ เวลาเกิดเหตุ และคำอธิบายปัญหาไปด้วย",
    },
    {
      zh: "这样可以更快定位问题并完成处理。",
      th: "ข้อมูลเหล่านี้จะช่วยให้ตรวจสอบและแก้ไขได้เร็วขึ้น",
    },
  ];

  tips.forEach((item, index) => {
    const top = 1.72 + index * 1.42;
    slide.addShape("roundRect", {
      x: 0.88,
      y: top,
      w: 4.72,
      h: 1.04,
      rectRadius: 0.08,
      fill: { color: index === 0 ? COLORS.soft : "F8FAFC" },
      line: { color: COLORS.line, pt: 1 },
    });
    slide.addText(item.zh, {
      x: 1.12,
      y: top + 0.12,
      w: 4.1,
      h: 0.26,
      fontFace: "Microsoft YaHei",
      fontSize: 11,
      bold: true,
      color: COLORS.ink,
      margin: 0,
    });
    slide.addText(item.th, {
      x: 1.12,
      y: top + 0.46,
      w: 4.1,
      h: 0.34,
      fontFace: "Segoe UI",
      fontSize: 9.5,
      color: COLORS.muted,
      margin: 0,
    });
  });

  slide.addShape("roundRect", {
    x: 6.18,
    y: 1.28,
    w: 6.55,
    h: 5.45,
    rectRadius: 0.12,
    fill: { color: COLORS.card },
    line: { color: COLORS.line, pt: 1 },
  });

  const dashboardImage = screenshotPath("dashboard.png");
  slide.addImage({
    path: dashboardImage,
    ...imageSizingContain(dashboardImage, 6.4, 1.54, 6.12, 4.44),
  });

  slide.addText("建议管理员补充：联系人、群组、工作时间", {
    x: 6.52,
    y: 6.1,
    w: 4.5,
    h: 0.24,
    fontFace: "Microsoft YaHei",
    fontSize: 10,
    color: COLORS.ink,
    margin: 0,
  });

  slide.addText("Suggested editable field: admin name, group chat, office hours", {
    x: 6.52,
    y: 6.36,
    w: 5.4,
    h: 0.2,
    fontFace: "Segoe UI",
    fontSize: 8.5,
    color: COLORS.muted,
    margin: 0,
  });

  addFooter(slide, "最后一页保留为可编辑联系信息区");
}

async function main() {
  ensureDirectories();
  copyAssets();

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "TRAE";
  pptx.company = "TRAE";
  pptx.subject = "Employee user guide";
  pptx.title = "员工使用说明";
  pptx.lang = "zh-CN";
  pptx.theme = {
    headFontFace: "Microsoft YaHei",
    bodyFontFace: "Microsoft YaHei",
    lang: "zh-CN",
  };

  buildCover(pptx);

  const totalPages = 1 + slides.length + 1;
  slides.forEach((section, index) => buildContentSlide(pptx, section, index + 2, totalPages));
  buildContactSlide(pptx, totalPages, totalPages);

  await pptx.writeFile({ fileName: pptxPath });
  console.log(`PPT generated: ${pptxPath}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
