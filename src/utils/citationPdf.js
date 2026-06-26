import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

export const exportCitationPdf = async (citation) => {
  try {
    if (!citation) return;

    const html = `

<html>
<head>
<meta charset="utf-8" /><style>

@page {
  size: 8.5in 13in;

  margin-top: 0.8in;
  margin-right: 0.3in;
  margin-bottom: 0.5in;
  margin-left: 0.3in;
}

body {
  font-family: "Times New Roman", serif;
  font-size: 13px;
  line-height: 1.35;
  color: #000;
}

.citation {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 12px;
}

.content {
  white-space: pre-wrap;
  text-align: justify;
}

</style></head><body><div class="citation">
${citation.citation || ""}
</div><div class="content">
${citation.description || ""}
</div></body>
</html>
`;
    const { uri } = await Print.printToFileAsync({
      html,
    });

    await Sharing.shareAsync(uri);
  } catch (e) {
    console.log("Citation PDF Error", e);
  }
};
