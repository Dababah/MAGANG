import PDFDocument from "pdfkit";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getPdfAccessScope } from "@/lib/auth/scope";

type RouteContext = { params: Promise<{ id: string }> };

type StatementDocument = {
  noRef: string | null;
  tanggal: Date;
  businessArea: string;
  namaLengkap: string;
  nipp: string;
  jabatan: string;
  tempatKedudukan: string;
  alasan: string;
  formVersion: {
    nomorDokumen: string;
    versi: string;
    tanggalTerbit: Date;
    teksKetentuan: string;
  };
};

function formatJakartaDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatJakartaYear(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
  }).format(date);
}

function safePdfText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[–—−]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, "...")
    .replace(/•/g, "-")
    .replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g, "?");
}

function fitTextToHeight(
  document: PDFKit.PDFDocument,
  value: string,
  width: number,
  height: number,
  fontSize: number,
) {
  let text = safePdfText(value);
  while (
    text.length > 0 &&
    document.fontSize(fontSize).heightOfString(text, { width, lineGap: 1 }) >
      height
  ) {
    text = `${text.slice(0, Math.max(0, text.length - 24)).trimEnd()}...`;
  }
  return text;
}

function drawHeader(
  document: PDFKit.PDFDocument,
  page: number,
  formVersion: StatementDocument["formVersion"],
) {
  const x = 32;
  const y = 22;
  const width = 531;
  const height = 50;
  const logoColumn = 70;
  const titleColumn = 215;
  const detailsX = x + logoColumn + titleColumn;

  document.save();
  document.lineWidth(0.55).strokeColor("#555555").fillColor("#222222");
  document.rect(x, y, width, height).stroke();
  document
    .moveTo(x + logoColumn, y)
    .lineTo(x + logoColumn, y + height)
    .stroke();
  document
    .moveTo(x + logoColumn + titleColumn, y)
    .lineTo(x + logoColumn + titleColumn, y + height)
    .stroke();
  document
    .moveTo(x, y + 25)
    .lineTo(x + width, y + 25)
    .stroke();
  document
    .moveTo(detailsX, y + 12.5)
    .lineTo(x + width, y + 12.5)
    .moveTo(detailsX, y + 37.5)
    .lineTo(x + width, y + 37.5)
    .stroke();

  document.image(
    path.join(
      process.cwd(),
      "assets",
      "pt-kai-kereta-api-indonesia-2020-seeklogo.png",
    ),
    x + 5,
    y + 2,
    { fit: [60, 22], align: "center", valign: "center" },
  );
  document
    .lineWidth(0.45)
    .strokeColor("#c7a900")
    .rect(x + 7, y + 31, 56, 13)
    .stroke();
  document
    .font("Helvetica")
    .fontSize(6)
    .fillColor("#c7a900")
    .text("TERBATAS", x + 7, y + 34, {
      width: 56,
      align: "center",
      ellipsis: true,
    });

  document
    .font("Helvetica-Bold")
    .fontSize(7)
    .fillColor("#222222")
    .text("PT KERETA API INDONESIA", x + logoColumn, y + 3, {
      width: titleColumn,
      align: "center",
    })
    .text("(PERSERO)", x + logoColumn, y + 10, {
      width: titleColumn,
      align: "center",
    })
    .font("Helvetica")
    .text("SISTEM INFORMASI", x + logoColumn, y + 17, {
      width: titleColumn,
      align: "center",
    })
    .font("Helvetica-Bold")
    .text("FORMULIR SURAT PERNYATAAN", x + logoColumn, y + 28, {
      width: titleColumn,
      align: "center",
    })
    .text("PEKERJA", x + logoColumn, y + 37, {
      width: titleColumn,
      align: "center",
    });

  const details = [
    ["Nomor", formVersion.nomorDokumen],
    ["Tanggal Terbit", formatJakartaDate(formVersion.tanggalTerbit)],
    ["Versi", formVersion.versi],
    ["Halaman", `${page} dari 2`],
  ];
  details.forEach(([label, value], index) => {
    const row = index < 2 ? index : index - 2;
    const columnY = index < 2 ? y + 3 + row * 12.5 : y + 28 + row * 12.5;
    document.font("Helvetica").fontSize(6.5).fillColor("#222222");
    document.text(label, detailsX + 4, columnY, { width: 54 });
    document.text(`: ${safePdfText(value)}`, detailsX + 60, columnY, {
      width: 123,
      ellipsis: true,
    });
  });
  document.restore();
}

function drawMetadata(
  document: PDFKit.PDFDocument,
  statement: StatementDocument,
) {
  const x = 38;
  const y = 88;
  const width = 170;
  const rowHeight = 12;
  const labelWidth = 68;
  const fields = [
    ["No. Ref", statement.noRef ?? "-"],
    ["Tanggal", formatJakartaDate(statement.tanggal)],
    ["Business Area", statement.businessArea],
  ];

  document.save().lineWidth(0.45).strokeColor("#666666");
  document.rect(x, y, width, rowHeight * fields.length).stroke();
  document
    .moveTo(x + labelWidth, y)
    .lineTo(x + labelWidth, y + rowHeight * fields.length)
    .stroke();
  for (let index = 1; index < fields.length; index += 1) {
    document
      .moveTo(x, y + rowHeight * index)
      .lineTo(x + width, y + rowHeight * index)
      .stroke();
  }
  fields.forEach(([label, value], index) => {
    const textY = y + index * rowHeight + 3;
    document.font("Helvetica").fontSize(7).fillColor("#222222");
    document.text(label, x + 3, textY, { width: labelWidth - 6 });
    document.text(`: ${safePdfText(value)}`, x + labelWidth + 3, textY, {
      width: width - labelWidth - 6,
      ellipsis: true,
    });
  });
  document.restore();
}

function drawTermsBox(
  document: PDFKit.PDFDocument,
  statement: StatementDocument,
) {
  const x = 38;
  const y = 486;
  const width = 519;
  const height = 240;
  const termsWidth = width - 14;
  const termsHeight = height - 23;
  const terms = fitTextToHeight(
    document,
    statement.formVersion.teksKetentuan,
    termsWidth,
    termsHeight,
    6.5,
  );

  document.save().lineWidth(0.55).strokeColor("#333333");
  document.rect(x, y, width, height).stroke();
  document.font("Helvetica-Bold").fontSize(7).fillColor("#111111");
  document.text(
    "Ketentuan Perusahaan dan Peraturan Perundang-undangan:",
    x + 5,
    y + 4,
    {
      width: width - 10,
    },
  );
  document.font("Helvetica").fontSize(6.5);
  document.text(terms, x + 7, y + 17, {
    width: termsWidth,
    lineGap: 1,
    ellipsis: true,
  });
  document.restore();
}

function drawFirstPage(
  document: PDFKit.PDFDocument,
  statement: StatementDocument,
) {
  const x = 38;
  const right = 557;
  drawHeader(document, 1, statement.formVersion);
  drawMetadata(document, statement);

  let y = 145;
  const writeLine = (text: string, size = 8, width = right - x) => {
    document
      .font("Helvetica")
      .fontSize(size)
      .fillColor("#111111")
      .text(safePdfText(text), x, y, { width, lineGap: 1 });
    y = document.y;
  };

  writeLine(
    "Pada hari ini, tanggal ................. bulan ................. tahun .................",
  );
  y += 11;
  writeLine("Dengan ini, saya yang bertandatangan di bawah ini:");
  const identity = [
    ["Nama Lengkap", statement.namaLengkap],
    ["NIPP", statement.nipp],
    ["Jabatan", statement.jabatan],
    ["Tempat Kedudukan", statement.tempatKedudukan],
  ];
  identity.forEach(([label, value]) => {
    document.font("Helvetica").fontSize(7.5).fillColor("#111111");
    document.text(label, x, y, { width: 85 });
    document.text(`: ${safePdfText(value)}`, x + 87, y, { width: 390 });
    y += 11;
  });
  y += 2;
  writeLine(
    "menyatakan bahwa saya tidak bersedia dilaksanakan install/uninstall perangkat lunak dan bersedia menanggung segala konsekuensinya baik secara finansial maupun hukum sesuai peraturan perundang-undangan yang berlaku serta ketentuan perusahaan.",
    7.5,
  );
  y += 11;
  writeLine("Alasan :");

  const reasonTop = y + 2;
  const reasonBottom = 365;
  document.save();
  document.font("Helvetica").fontSize(7.5).fillColor("#111111");
  const reasonWidth = right - x;
  const reasonHeight = reasonBottom - reasonTop - 2;
  const reasonText = fitTextToHeight(
    document,
    statement.alasan.replace(/\s*\n\s*/g, " "),
    reasonWidth,
    reasonHeight,
    7.5,
  );
  document.lineWidth(0.3).strokeColor("#555555");
  for (let lineY = reasonTop + 14; lineY < reasonBottom; lineY += 14) {
    document.moveTo(x, lineY).lineTo(right, lineY).stroke();
  }
  document.font("Helvetica").fontSize(7.5).fillColor("#111111");
  document.text(reasonText, x, reasonTop, {
    width: reasonWidth,
    lineGap: 2,
  });
  document.restore();

  document
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#111111")
    .text("Demikian, surat pernyataan ini dibuat.", x, 371, {
      width: right - x,
    });
  document
    .font("Helvetica")
    .fontSize(7.5)
    .text(
      `${safePdfText(statement.tempatKedudukan)}, ................. ${formatJakartaYear(statement.tanggal)}`,
      x + 230,
      380,
      { width: right - x - 230, align: "right" },
    );

  const signatureX = x + 24;
  const signatureY = 395;
  const signatureWidth = right - x - 48;
  const signatureHeight = 82;
  const center = signatureX + signatureWidth / 2;
  document.save().lineWidth(0.4).strokeColor("#666666");
  document
    .rect(signatureX, signatureY, signatureWidth, signatureHeight)
    .stroke();
  document
    .moveTo(center, signatureY)
    .lineTo(center, signatureY + signatureHeight)
    .stroke();
  document
    .moveTo(signatureX, signatureY + 12)
    .lineTo(signatureX + signatureWidth, signatureY + 12)
    .stroke();
  document
    .moveTo(signatureX, signatureY + 62)
    .lineTo(signatureX + signatureWidth, signatureY + 62)
    .stroke();
  document.font("Helvetica").fontSize(7).fillColor("#111111");
  document.text("Pekerja", center, signatureY + 2, {
    width: signatureWidth / 2,
    align: "center",
  });
  document.text("NIPP", center, signatureY + 66, {
    width: signatureWidth / 2,
    align: "center",
  });
  document
    .font("Helvetica-Bold")
    .fontSize(7)
    .text(safePdfText(statement.nipp), center, signatureY + 73, {
      width: signatureWidth / 2,
      align: "center",
    });
  document.restore();

  drawTermsBox(document, statement);
}

function drawSecondPage(
  document: PDFKit.PDFDocument,
  statement: StatementDocument,
) {
  const x = 38;
  const y = 88;
  const width = 520;

  drawHeader(document, 2, statement.formVersion);
  drawMetadata(document, statement);

  document
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("#111111")
    .text("Ringkasan dan catatan pernyataan", x, y + 80, { width: width });

  const summaryRows = [
    ["Nama lengkap", statement.namaLengkap],
    ["NIPP", statement.nipp],
    ["Jabatan", statement.jabatan],
    ["Tempat kedudukan", statement.tempatKedudukan],
    ["Business Area", statement.businessArea],
    ["Tanggal surat", formatJakartaDate(statement.tanggal)],
  ];

  let rowY = y + 100;
  summaryRows.forEach(([label, value]) => {
    document
      .font("Helvetica-Bold")
      .fontSize(7)
      .text(`${label}:`, x, rowY, { width: 120 });
    document
      .font("Helvetica")
      .fontSize(7)
      .text(safePdfText(String(value)), x + 130, rowY, { width: width - 140 });
    rowY += 16;
  });

  const reasonBoxY = rowY + 14;
  document
    .font("Helvetica-Bold")
    .fontSize(8)
    .text("Alasan / keterangan", x, reasonBoxY, { width: width });

  const reasonText = fitTextToHeight(
    document,
    statement.alasan.replace(/\s*\n\s*/g, " "),
    width - 12,
    160,
    7.5,
  );

  document
    .save()
    .lineWidth(0.35)
    .strokeColor("#666666")
    .rect(x, reasonBoxY + 16, width, 140)
    .stroke();

  document
    .font("Helvetica")
    .fontSize(7.5)
    .fillColor("#111111")
    .text(reasonText, x + 8, reasonBoxY + 22, {
      width: width - 16,
      lineGap: 2,
    });

  document.restore();

  const signatureY = 530;
  document
    .font("Helvetica-Bold")
    .fontSize(7)
    .text("Pekerja", x + 60, signatureY, { width: 180, align: "center" })
    .text("NIPP", x + width - 190, signatureY, {
      width: 180,
      align: "center",
    });

  document
    .lineWidth(0.35)
    .strokeColor("#666666")
    .moveTo(x + 50, signatureY + 22)
    .lineTo(x + 200, signatureY + 22)
    .moveTo(x + width - 210, signatureY + 22)
    .lineTo(x + width - 60, signatureY + 22)
    .stroke();

  document
    .font("Helvetica-Bold")
    .fontSize(7)
    .text(safePdfText(statement.nipp), x + width - 190, signatureY + 28, {
      width: 180,
      align: "center",
    });
}

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Silakan masuk untuk melanjutkan" },
      { status: 401 },
    );
  }

  const { id: rawId } = await params;
  const statementId = Number(rawId);
  if (!Number.isSafeInteger(statementId) || statementId < 1) {
    return NextResponse.json(
      { error: "Nomor pernyataan tidak valid" },
      { status: 400 },
    );
  }

  const scope = getPdfAccessScope(user);
  const statement = await prisma.statement.findFirst({
    where: { id: statementId, ...scope },
    include: {
      formVersion: true,
    },
  });

  if (!statement || !statement.noRef || statement.status === "DRAFT") {
    return NextResponse.json(
      { error: "Dokumen tidak ditemukan" },
      { status: 404 },
    );
  }

  const document = new PDFDocument({
    size: "A4",
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    info: {
      Title: `Pernyataan ${statement.noRef}`,
      Subject: "Salinan UJI/operasional surat pernyataan pekerja",
      Author: "Portal Pernyataan KAI",
    },
  });
  const chunks: Buffer[] = [];
  const pdfBuffer = new Promise<Buffer>((resolve, reject) => {
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
  });

  drawFirstPage(document, statement);
  document.addPage({
    size: "A4",
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
  });
  drawSecondPage(document, statement);
  document.end();

  const buffer = await pdfBuffer;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${statement.noRef}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
