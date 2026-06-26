import assert from "node:assert/strict";
import { normalizeCourtJudgeFields } from "../src/utils/courtJudgeParser.js";

const cases = [
  {
    name: "Civil Judge Class-II Judicial Magistrate",
    input: {
      court: "Civil Judge Class-II/Judicial Magistrate Ist Class, M.B.Din",
      judge: "",
    },
    court: "Civil Judge Class-II/Judicial Magistrate Ist Class, M.B.Din",
    judge: "",
  },
  {
    name: "Civil Judge Class-III",
    input: { court: "Civil Judge Class-III, M.B.Din", judge: "" },
    court: "Civil Judge Class-III, M.B.Din",
    judge: "",
  },
  {
    name: "Civil Judge Family Court composite",
    input: {
      court: "Civil Judge Ist Class/Judge Family Court, Phalia, M.B.Din",
      judge: "",
    },
    court: "Civil Judge Ist Class/Judge Family Court, Phalia, M.B.Din",
    judge: "",
  },
  {
    name: "Civil Judge Judicial Magistrate Section 30",
    input: {
      court: "Civil Judge Ist Class/Judicial Magistrate Section-30, M.B.Din",
      judge: "",
    },
    court: "Civil Judge Ist Class/Judicial Magistrate Section-30, M.B.Din",
    judge: "",
  },
  {
    name: "Senior Civil Judge Civil Division",
    input: { court: "Senior Civil Judge (Civil Division), M.B.Din", judge: "" },
    court: "Senior Civil Judge (Civil Division), M.B.Din",
    judge: "",
  },
  {
    name: "Senior Civil Judge Criminal Division",
    input: {
      court: "Senior Civil Judge (Criminal Division), M.B.Din",
      judge: "",
    },
    court: "Senior Civil Judge (Criminal Division), M.B.Din",
    judge: "",
  },
  {
    name: "Senior Civil Judge Family Division",
    input: {
      court: "Senior Civil Judge (Family Division), M.B.Din",
      judge: "",
    },
    court: "Senior Civil Judge (Family Division), M.B.Din",
    judge: "",
  },
  {
    name: "Additional District Judge Gujrat",
    input: { court: "Additional District Judge, Gujrat", judge: "" },
    court: "Additional District Judge, Gujrat",
    judge: "",
  },
  {
    name: "District Judge Lahore",
    input: { court: "District Judge, Lahore", judge: "" },
    court: "District Judge, Lahore",
    judge: "",
  },
  {
    name: "Additional Sessions Judge Rawalpindi",
    input: { court: "Additional Sessions Judge, Rawalpindi", judge: "" },
    court: "Additional Sessions Judge, Rawalpindi",
    judge: "",
  },
  {
    name: "Sessions Judge Faisalabad",
    input: { court: "Sessions Judge, Faisalabad", judge: "" },
    court: "Sessions Judge, Faisalabad",
    judge: "",
  },
  {
    name: "Banking Court Karachi",
    input: { court: "Banking Court, Karachi", judge: "" },
    court: "Banking Court, Karachi",
    judge: "",
  },
  {
    name: "Labour Court Lahore",
    input: { court: "Labour Court, Lahore", judge: "" },
    court: "Labour Court, Lahore",
    judge: "",
  },
  {
    name: "Consumer Court Gujranwala",
    input: { court: "Consumer Court, Gujranwala", judge: "" },
    court: "Consumer Court, Gujranwala",
    judge: "",
  },
  {
    name: "Multiline Ms judge and section court",
    input: {
      court: "Ms. Huma Altaf\nCivil Judge Ist Class/Judicial Magistrate Section-30, M.B.Din",
      judge: "",
    },
    court: "Civil Judge Ist Class/Judicial Magistrate Section-30, M.B.Din",
    judge: "Ms. Huma Altaf",
  },
  {
    name: "Multiline Mr judge and ADJ court",
    input: {
      court: "Mr. Muhammad Aslam\nAdditional District Judge, Gujrat",
      judge: "",
    },
    court: "Additional District Judge, Gujrat",
    judge: "Mr. Muhammad Aslam",
  },
  {
    name: "Justice and senior civil judge",
    input: {
      court: "Justice Ali Raza\nSenior Civil Judge (Civil Division), Lahore",
      judge: "",
    },
    court: "Senior Civil Judge (Civil Division), Lahore",
    judge: "Justice Ali Raza",
  },
  {
    name: "Combined court and judge in same field",
    input: {
      court: "Additional District Judge, Gujrat Mr. Muhammad Aslam",
      judge: "Additional District Judge, Gujrat Mr. Muhammad Aslam",
    },
    court: "Additional District Judge, Gujrat",
    judge: "Mr. Muhammad Aslam",
  },
  {
    name: "Judge marker at end",
    input: {
      court: "Civil Judge Class-I, Lahore Judge Muhammad Ali",
      judge: "",
    },
    court: "Civil Judge Class-I, Lahore",
    judge: "Muhammad Ali",
  },
  {
    name: "Section 22A court",
    input: {
      court: "Additional Sessions Judge Section-22A, Rawalpindi",
      judge: "Mrs. Ayesha Khan",
    },
    court: "Additional Sessions Judge Section-22A, Rawalpindi",
    judge: "Mrs. Ayesha Khan",
  },
  {
    name: "Section 22B court",
    input: {
      court: "Additional Sessions Judge Section-22B, Sargodha",
      judge: "Mr. Ahmed Raza",
    },
    court: "Additional Sessions Judge Section-22B, Sargodha",
    judge: "Mr. Ahmed Raza",
  },
  {
    name: "Uncertain identical value",
    input: { court: "Unknown Combined Value", judge: "Unknown Combined Value" },
    court: "Unknown Combined Value",
    judge: "",
  },
];

for (const item of cases) {
  const result = normalizeCourtJudgeFields(item.input, { source: "test" });
  assert.equal(result.court, item.court, `${item.name}: court`);
  assert.equal(result.judge, item.judge, `${item.name}: judge`);
  assert.equal(result.aiRawMetadata.source, "test", `${item.name}: metadata`);
}

console.log(`courtJudgeParser: ${cases.length} cases passed`);
