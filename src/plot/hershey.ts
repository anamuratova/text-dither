// Hershey Sans 1-stroke ("futural") vector font data, JHF format.
//
// Provenance: original Hershey fonts digitized by Dr. Allen V. Hershey at the
// US Naval Weapons Laboratory (1967), released into the public domain. This
// JHF transcription is the classic James Hurt / usenet distribution, vendored
// verbatim from https://github.com/kamalmostafa/hershey-fonts
// (hershey-fonts/futural.jhf), lines 1-95 mapping to ASCII 32-126 in order.
//
// JHF line format: cols 0-4 glyph id, cols 5-7 vertex-pair count n, then n
// two-char pairs. Pair 1 is the left/right hand bounds; the rest are vertices
// with coordinates (charCode - 82) i.e. relative to letter R, y growing
// downward (same as canvas). The pair " R" (space, R) is pen-up.
const FUTURAL_JHF: string[] = [
  "12345  1JZ",
  "12345  9MWRFRT RRYQZR[SZRY",
  "12345  6JZNFNM RVFVM",
  "12345 12H]SBLb RYBRb RLOZO RKUYU",
  "12345 27H\\PBP_ RTBT_ RYIWGTFPFMGKIKKLMMNOOUQWRXSYUYXWZT[P[MZKX",
  "12345 32F^[FI[ RNFPHPJOLMMKMIKIIJGLFNFPGSHVHYG[F RWTUUTWTYV[X[ZZ[X[VYTWT",
  "12345 35E_\\O\\N[MZMYNXPVUTXRZP[L[JZIYHWHUISJRQNRMSKSIRGPFNGMIMKNNPQUXWZY[[[\\Z\\Y",
  "12345  8MWRHQGRFSGSIRKQL",
  "12345 11KYVBTDRGPKOPOTPYR]T`Vb",
  "12345 11KYNBPDRGTKUPUTTYR]P`Nb",
  "12345  9JZRLRX RMOWU RWOMU",
  "12345  6E_RIR[ RIR[R",
  "12345  8NVSWRXQWRVSWSYQ[",
  "12345  3E_IR[R",
  "12345  6NVRVQWRXSWRV",
  "12345  3G][BIb",
  "12345 18H\\QFNGLJKOKRLWNZQ[S[VZXWYRYOXJVGSFQF",
  "12345  5H\\NJPISFS[",
  "12345 15H\\LKLJMHNGPFTFVGWHXJXLWNUQK[Y[",
  "12345 16H\\MFXFRNUNWOXPYSYUXXVZS[P[MZLYKW",
  "12345  7H\\UFKTZT RUFU[",
  "12345 18H\\WFMFLOMNPMSMVNXPYSYUXXVZS[P[MZLYKW",
  "12345 24H\\XIWGTFRFOGMJLOLTMXOZR[S[VZXXYUYTXQVOSNRNOOMQLT",
  "12345  6H\\YFO[ RKFYF",
  "12345 30H\\PFMGLILKMMONSOVPXRYTYWXYWZT[P[MZLYKWKTLRNPQOUNWMXKXIWGTFPF",
  "12345 24H\\XMWPURRSQSNRLPKMKLLINGQFRFUGWIXMXRWWUZR[P[MZLX",
  "12345 12NVROQPRQSPRO RRVQWRXSWRV",
  "12345 14NVROQPRQSPRO RSWRXQWRVSWSYQ[",
  "12345  4F^ZIJRZ[",
  "12345  6E_IO[O RIU[U",
  "12345  4F^JIZRJ[",
  "12345 21I[LKLJMHNGPFTFVGWHXJXLWNVORQRT RRYQZR[SZRY",
  "12345 56E`WNVLTKQKOLNMMPMSNUPVSVUUVS RQKOMNPNSOUPV RWKVSVUXVZV\\T]Q]O\\L[JYHWGTFQFNGLHJJILHOHRIUJWLYNZQ[T[WZYYZX RXKWSWUXV",
  "12345  9I[RFJ[ RRFZ[ RMTWT",
  "12345 24G\\KFK[ RKFTFWGXHYJYLXNWOTP RKPTPWQXRYTYWXYWZT[K[",
  "12345 19H]ZKYIWGUFQFOGMILKKNKSLVMXOZQ[U[WZYXZV",
  "12345 16G\\KFK[ RKFRFUGWIXKYNYSXVWXUZR[K[",
  "12345 12H[LFL[ RLFYF RLPTP RL[Y[",
  "12345  9HZLFL[ RLFYF RLPTP",
  "12345 23H]ZKYIWGUFQFOGMILKKNKSLVMXOZQ[U[WZYXZVZS RUSZS",
  "12345  9G]KFK[ RYFY[ RKPYP",
  "12345  3NVRFR[",
  "12345 11JZVFVVUYTZR[P[NZMYLVLT",
  "12345  9G\\KFK[ RYFKT RPOY[",
  "12345  6HYLFL[ RL[X[",
  "12345 12F^JFJ[ RJFR[ RZFR[ RZFZ[",
  "12345  9G]KFK[ RKFY[ RYFY[",
  "12345 22G]PFNGLIKKJNJSKVLXNZP[T[VZXXYVZSZNYKXIVGTFPF",
  "12345 14G\\KFK[ RKFTFWGXHYJYMXOWPTQKQ",
  "12345 25G]PFNGLIKKJNJSKVLXNZP[T[VZXXYVZSZNYKXIVGTFPF RSWY]",
  "12345 17G\\KFK[ RKFTFWGXHYJYLXNWOTPKP RRPY[",
  "12345 21H\\YIWGTFPFMGKIKKLMMNOOUQWRXSYUYXWZT[P[MZKX",
  "12345  6JZRFR[ RKFYF",
  "12345 11G]KFKULXNZQ[S[VZXXYUYF",
  "12345  6I[JFR[ RZFR[",
  "12345 12F^HFM[ RRFM[ RRFW[ R\\FW[",
  "12345  6H\\KFY[ RYFK[",
  "12345  7I[JFRPR[ RZFRP",
  "12345  9H\\YFK[ RKFYF RK[Y[",
  "12345 12KYOBOb RPBPb ROBVB RObVb",
  "12345  3KYKFY^",
  "12345 12KYTBTb RUBUb RNBUB RNbUb",
  "12345  6JZRDJR RRDZR",
  "12345  3I[Ib[b",
  "12345  8NVSKQMQORPSORNQO",
  "12345 18I\\XMX[ RXPVNTMQMONMPLSLUMXOZQ[T[VZXX",
  "12345 18H[LFL[ RLPNNPMSMUNWPXSXUWXUZS[P[NZLX",
  "12345 15I[XPVNTMQMONMPLSLUMXOZQ[T[VZXX",
  "12345 18I\\XFX[ RXPVNTMQMONMPLSLUMXOZQ[T[VZXX",
  "12345 18I[LSXSXQWOVNTMQMONMPLSLUMXOZQ[T[VZXX",
  "12345  9MYWFUFSGRJR[ ROMVM",
  "12345 23I\\XMX]W`VaTbQbOa RXPVNTMQMONMPLSLUMXOZQ[T[VZXX",
  "12345 11I\\MFM[ RMQPNRMUMWNXQX[",
  "12345  9NVQFRGSFREQF RRMR[",
  "12345 12MWRFSGTFSERF RSMS^RaPbNb",
  "12345  9IZMFM[ RWMMW RQSX[",
  "12345  3NVRFR[",
  "12345 19CaGMG[ RGQJNLMOMQNRQR[ RRQUNWMZM\\N]Q][",
  "12345 11I\\MMM[ RMQPNRMUMWNXQX[",
  "12345 18I\\QMONMPLSLUMXOZQ[T[VZXXYUYSXPVNTMQM",
  "12345 18H[LMLb RLPNNPMSMUNWPXSXUWXUZS[P[NZLX",
  "12345 18I\\XMXb RXPVNTMQMONMPLSLUMXOZQ[T[VZXX",
  "12345  9KXOMO[ ROSPPRNTMWM",
  "12345 18J[XPWNTMQMNNMPNRPSUTWUXWXXWZT[Q[NZMX",
  "12345  9MYRFRWSZU[W[ ROMVM",
  "12345 11I\\MMMWNZP[S[UZXW RXMX[",
  "12345  6JZLMR[ RXMR[",
  "12345 12G]JMN[ RRMN[ RRMV[ RZMV[",
  "12345  6J[MMX[ RXMM[",
  "12345 10JZLMR[ RXMR[P_NaLbKb",
  "12345  9J[XMM[ RMMXM RM[X[",
  "12345 40KYTBRCQDPFPHQJRKSMSOQQ RRCQEQGRISJTLTNSPORSTTVTXSZR[Q]Q_Ra RQSSUSWRYQZP\\P^Q`RaTb",
  "12345  3NVRBRb",
  "12345 40KYPBRCSDTFTHSJRKQMQOSQ RRCSESGRIQJPLPNQPURQTPVPXQZR[S]S_Ra RSSQUQWRYSZT\\T^S`RaPb",
  "12345 24F^IUISJPLONOPPTSVTXTZS[Q RISJQLPNPPQTTVUXUZT[Q[O",
];

export interface Polyline {
  pts: Array<[number, number]>; // glyph-local units
}

// Classic Hershey metrics: cap top y=-12, baseline y=+9; 32 units per em.
export const HERSHEY_UNITS_PER_EM = 32;

const PEN_UP_X = ' '.charCodeAt(0) - 82;

function parseJhfLine(line: string): Polyline[] {
  const polylines: Polyline[] = [];
  let current: Array<[number, number]> = [];
  // skip glyph id (cols 0-4), pair count (cols 5-7), and the bounds pair
  for (let i = 10; i < line.length; i += 2) {
    const x = line.charCodeAt(i) - 82;
    const y = line.charCodeAt(i + 1) - 82;
    if (x === PEN_UP_X && line[i + 1] === 'R') {
      if (current.length > 1) polylines.push({ pts: current });
      current = [];
      continue;
    }
    current.push([x, y]);
  }
  if (current.length > 1) polylines.push({ pts: current });
  return polylines;
}

const GLYPHS: Polyline[][] = FUTURAL_JHF.map(parseJhfLine);
const PERIOD = GLYPHS['.'.charCodeAt(0) - 32];

// Mapped chars return their strokes (space maps to zero strokes). Unmapped
// chars render as the Hershey period - never throw, never skip: every cell
// must stay visible to preserve the reading sequence.
export function glyphPolylines(ch: string): Polyline[] {
  const code = ch.codePointAt(0) ?? 0;
  if (code >= 32 && code <= 126) return GLYPHS[code - 32];
  return PERIOD;
}
