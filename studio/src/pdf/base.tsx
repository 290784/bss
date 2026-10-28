import { Circle, Defs, Font, Image, LinearGradient, Page, Path, Rect, Stop, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import type { Bloco, Documento, SecaoDocumento, Studio } from "@/data/types";
import { bss } from "@/theme/tokens";
import { formatarPreco } from "@/utils/format";

/**
 * Base dos PDFs (Manual e Guia) com a identidade BSS: capa e encerramento no degradê da marca,
 * páginas de conteúdo na paleta clara do BSS (melhor para ler e imprimir). Uma seção = uma página.
 */
export type FontesPdf = { corpo400: string; corpo600: string; titulo700: string; assinatura: string };

let registradas = false;
export function registrarFontes(f: FontesPdf) {
  if (registradas) return;
  Font.register({ family: bss.fontes.corpo, fonts: [{ src: f.corpo400, fontWeight: 400 }, { src: f.corpo600, fontWeight: 600 }] });
  Font.register({ family: bss.fontes.titulo, fonts: [{ src: f.titulo700, fontWeight: 700 }] });
  Font.register({ family: bss.fontes.assinatura, src: f.assinatura });
  Font.registerHyphenationCallback((w) => [w]); // sem hifenização automática (pt-BR)
  registradas = true;
}

const c = bss.claro;
const branco = bss.sobreMarca;
const lilas = bss.sobreMarcaSuave;

const A5: [number, number] = [419.53, 595.28];

/** Imagens de public/: no navegador viram URL absoluta; nos testes, caminho no disco. */
let resolver = (src: string) => src;
export function definirOrigemImagens(fn: (src: string) => string) { resolver = fn; }

type Cantos = { tl?: number; tr?: number; br?: number; bl?: number };
const M = 34;

const s = StyleSheet.create({
  pagina: { backgroundColor: c.fundo, color: c.texto, fontFamily: bss.fontes.corpo, fontSize: 10, lineHeight: 1.45, padding: M, paddingBottom: M + 14 },
  rodape: { position: "absolute", left: M, right: M, bottom: 18, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: c.textoApoio },
  marcador: { fontSize: 8.5, color: c.primariaTexto, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase" },
  titulo: { fontFamily: bss.fontes.titulo, fontWeight: 700, fontSize: 25, lineHeight: 1.05, color: c.texto, marginTop: 2 },
  subtitulo: { fontSize: 12.5, lineHeight: 1.3, fontWeight: 600, color: c.primariaTexto, marginTop: 4 },
  cartao: { backgroundColor: c.superficie, borderRadius: 14, borderWidth: 1, borderColor: c.borda, padding: 14, marginTop: 12 },
  paragrafo: { color: c.textoSuave, marginBottom: 8 },
  item: { flexDirection: "row", marginBottom: 5 },
  losango: { width: 5, height: 5, backgroundColor: c.primaria, transform: "rotate(45deg)", marginTop: 5, marginRight: 8 },
});

function Degrade({ w, h, raio = 0 }: { w: number; h: number; raio?: number }) {
  const [a, b, cc, d] = bss.degrade;
  return (
    <Svg width={w} height={h} style={{ position: "absolute", top: 0, left: 0 }}>
      <Defs>
        <LinearGradient id="marca" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={a} /><Stop offset="0.34" stopColor={b} /><Stop offset="0.66" stopColor={cc} /><Stop offset="1" stopColor={d} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={w} height={h} rx={raio} ry={raio} fill="url(#marca)" />
    </Svg>
  );
}

function Brilhos({ w, h }: { w: number; h: number }) {
  const pts: [number, number, number][] = [[0.12, 0.1, 7], [0.86, 0.08, 5], [0.72, 0.46, 6], [0.2, 0.7, 4], [0.9, 0.84, 6], [0.5, 0.92, 4]];
  return (
    <Svg width={w} height={h} style={{ position: "absolute", top: 0, left: 0 }}>
      {pts.map(([x, y, r], i) => {
        const cx = x * w, cy = y * h;
        return <Path key={i} fill={bss.claro.primariaSuave} opacity={0.85}
          d={`M ${cx} ${cy - r} Q ${cx} ${cy} ${cx + r} ${cy} Q ${cx} ${cy} ${cx} ${cy + r} Q ${cx} ${cy} ${cx - r} ${cy} Q ${cx} ${cy} ${cx} ${cy - r} Z`} />;
      })}
    </Svg>
  );
}

function Logo({ studio, claro, grande }: { studio: Studio; claro?: boolean; grande?: boolean }) {
  const tam = grande ? 54 : 38;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={{ width: tam, height: tam, borderRadius: 12, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: lilas }}>
        <Degrade w={tam} h={tam} />
        {studio.marca.simbolo
          ? <Image src={resolver(studio.marca.simbolo.src)} style={{ width: tam * 0.72, height: tam * 0.72 }} />
          : <Text style={{ fontFamily: bss.fontes.titulo, fontWeight: 700, fontSize: tam * 0.42, color: branco }}>{studio.marca.monograma}</Text>}
      </View>
      <Text style={{ fontFamily: bss.fontes.assinatura, fontSize: grande ? 34 : 26, color: claro ? branco : c.primariaTexto }}>{studio.marca.nome.replace(/^Studio /, "")}</Text>
    </View>
  );
}

function FotoPdf({ src, placeholder, w, h, cantos }: { src: string; placeholder?: boolean; w: number; h: number; cantos?: Cantos }) {
  // SVG/placeholder não entram no PDF como imagem: vira um quadro marcado "Foto provisória".
  if (placeholder || src.endsWith(".svg"))
    return (
      <View style={{ width: w, height: h, borderRadius: 12, overflow: "hidden", alignItems: "center", justifyContent: "flex-end", padding: 8 }}>
        <Degrade w={w} h={h} />
        <Text style={{ fontSize: 8, color: branco, opacity: 0.85 }}>Foto provisória</Text>
      </View>
    );
  const r = cantos
    ? { borderTopLeftRadius: cantos.tl ?? 6, borderTopRightRadius: cantos.tr ?? 6, borderBottomRightRadius: cantos.br ?? 6, borderBottomLeftRadius: cantos.bl ?? 6 }
    : { borderRadius: 12 };
  return (
    <View style={{ width: w, height: h, overflow: "hidden", ...r }}>
      <Image src={resolver(src)} style={{ width: w, height: h, objectFit: "cover" }} />
    </View>
  );
}

function Mapa({ w, src }: { w: number; src?: string }) {
  const r = w / 2;
  if (src)
    return (
      <View style={{ width: w, height: w, borderRadius: r, borderWidth: 3, borderColor: lilas, overflow: "hidden" }}>
        <Image src={resolver(src)} style={{ width: w - 6, height: w - 6, objectFit: "cover" }} />
      </View>
    );
  return (
    <Svg width={w} height={w}>
      <Circle cx={r} cy={r} r={r - 3} fill={branco} fillOpacity={0.13} stroke={branco} strokeOpacity={0.4} strokeWidth={3} />
      <Path d={`M ${-10} ${r * 0.75} C ${r * 0.5} ${r * 0.6} ${r * 1.1} ${r} ${w + 10} ${r * 0.8}`} stroke={branco} strokeOpacity={0.25} strokeWidth={6} fill="none" />
      <Path d={`M ${-10} ${r * 1.45} C ${r * 0.6} ${r * 1.3} ${r * 1.3} ${r * 1.6} ${w + 10} ${r * 1.38}`} stroke={branco} strokeOpacity={0.25} strokeWidth={6} fill="none" />
      <Path d={`M ${r * 0.7} ${-10} C ${r * 0.62} ${r * 0.6} ${r * 0.88} ${r * 1.4} ${r * 0.75} ${w + 10}`} stroke={branco} strokeOpacity={0.25} strokeWidth={6} fill="none" />
      <Path fill={branco} d={`M ${r} ${r + 22} C ${r} ${r + 22} ${r - 16} ${r + 4} ${r - 16} ${r - 8} A 16 16 0 1 1 ${r + 16} ${r - 8} C ${r + 16} ${r + 4} ${r} ${r + 22} ${r} ${r + 22} Z`} />
      <Circle cx={r} cy={r - 8} r={6} fill={bss.degrade[2]} />
    </Svg>
  );
}

function Blocos({ blocos, studio, sobreMarca }: { blocos: Bloco[]; studio: Studio; sobreMarca?: boolean }) {
  const corTexto = sobreMarca ? lilas : c.textoSuave;
  return (
    <View>
      {blocos.map((b, i) => {
        switch (b.tipo) {
          case "paragrafo": return <Text key={i} style={[s.paragrafo, { color: corTexto }]}>{b.texto}</Text>;
          case "lista": return (
            <View key={i} style={{ marginTop: 2, marginBottom: 6 }}>
              {b.itens.map((t) => <View key={t} style={s.item} wrap={false}><View style={s.losango} /><Text style={{ flex: 1, color: c.textoSuave }}>{t}</Text></View>)}
            </View>
          );
          case "topicos": return (
            <View key={i}>
              {b.itens.map((t) => (
                <View key={t.titulo} style={{ backgroundColor: c.afundado, borderRadius: 10, padding: 11, marginBottom: 8 }} wrap={false}>
                  <Text style={{ fontFamily: bss.fontes.titulo, fontWeight: 700, fontSize: 13.5, color: c.primariaTexto, letterSpacing: 0.4 }}>{t.titulo}</Text>
                  <Text style={{ color: c.textoSuave, marginTop: 3 }}>{t.texto}</Text>
                </View>
              ))}
            </View>
          );
          case "destaque": return (
            <View key={i} style={{ backgroundColor: c.primariaSuave, borderRadius: 10, borderWidth: 1, borderColor: c.bordaForte, padding: 11, marginTop: 4 }} wrap={false}>
              <Text style={{ fontWeight: 600, color: c.texto }}>{b.texto}</Text>
              {b.acao === "whatsapp" && <Text style={{ marginTop: 5, color: c.primariaTexto, fontWeight: 600 }}>WhatsApp: {studio.contato.whatsapp.exibicao}</Text>}
            </View>
          );
          case "dicas": return (
            <View key={i} style={{ borderWidth: 1, borderStyle: "dashed", borderColor: c.bordaForte, borderRadius: 10, padding: 10, marginTop: 4, marginBottom: 6 }}>
              <Text style={{ fontWeight: 600, color: c.texto, marginBottom: 4 }}>{b.titulo}</Text>
              {b.itens.map((t) => <Text key={t} style={{ color: c.textoSuave, marginBottom: 3, fontSize: 9.5 }}>• {t}</Text>)}
            </View>
          );
          case "fotos": return (
            <View key={i} style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
              {b.fotos.map((f, n) => {
                const w = (A5[0] - 2 * M - 32 - 10) / 2, raio = w * 0.3;
                return <FotoPdf key={f.src} {...f} w={w} h={w * 6 / 7} cantos={n % 2 ? { tr: raio, bl: raio } : { tl: raio, br: raio }} />;
              })}
            </View>
          );
          case "assinatura": return (
            <View key={i} style={{ marginTop: 4 }}>
              <Text style={{ color: c.textoSuave }}>{b.despedida}</Text>
              <Text style={{ fontFamily: bss.fontes.assinatura, fontSize: 30, color: c.primariaTexto, marginTop: 2 }}>{b.nome}</Text>
            </View>
          );
          case "valores": return (
            <View key={i}>
              <View style={{ borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: c.borda }}>
                <View style={{ flexDirection: "row", paddingHorizontal: 12, paddingVertical: 7 }}>
                  <Degrade w={A5[0] - 2 * M - 32} h={26} />
                  <Text style={{ flex: 1, color: branco, fontWeight: 600, fontSize: 9.5 }}>Serviço</Text>
                  <Text style={{ color: branco, fontWeight: 600, fontSize: 9.5 }}>Valor</Text>
                </View>
                {studio.valores.itens.map((v, n) => (
                  <View key={v.nome} style={{ flexDirection: "row", paddingHorizontal: 12, paddingVertical: 6.5, backgroundColor: n % 2 ? c.afundado : c.superficie }}>
                    <Text style={{ flex: 1, color: c.texto }}>{v.nome}</Text>
                    <Text style={{ color: c.texto, fontWeight: 600 }}>{formatarPreco(v.precoCentavos)}</Text>
                  </View>
                ))}
              </View>
              <View style={{ marginTop: 10 }}>
                {studio.valores.notas.map((t) => <Text key={t} style={{ fontSize: 9, color: c.textoSuave, marginBottom: 3 }}>• {t}</Text>)}
              </View>
            </View>
          );
          case "localizacao": {
            const e = studio.contato.endereco;
            const w = A5[0] - 2 * M;
            return (
              <View key={i} style={{ borderRadius: 14, overflow: "hidden", padding: 20, alignItems: "center", marginTop: 4 }}>
                <Degrade w={w} h={330} raio={14} />
                <Mapa w={150} src={b.mapa?.src} />
                <Text style={{ color: branco, fontWeight: 600, fontSize: 13, marginTop: 14, textAlign: "center" }}>
                  {`${e.linha.replace(", N ", " ")}${e.complemento ? `, ${e.complemento}` : ""} – ${e.bairro} – ${e.uf}`}
                </Text>
                {e.referencia && <Text style={{ color: lilas, fontSize: 10, marginTop: 4, textAlign: "center" }}>({e.referencia})</Text>}
                <Text style={{ color: lilas, fontSize: 10, marginTop: 10 }}>WhatsApp: {studio.contato.whatsapp.exibicao}</Text>
              </View>
            );
          }
          case "logo": return <View key={i} style={{ marginTop: 14 }}><Logo studio={studio} claro={sobreMarca} grande /></View>;
        }
      })}
    </View>
  );
}

function PaginaSecao({ secao, n, total, studio, doc }: { secao: SecaoDocumento; n: number; total: number; studio: Studio; doc: Documento }) {
  const marca = secao.estilo === "capa" || secao.estilo === "encerramento";
  const rodape = (
    <View style={[s.rodape, marca ? { color: lilas } : {}]} fixed>
      <Text>{studio.marca.nome} · {doc.titulo}</Text><Text>{n} de {total}</Text>
    </View>
  );
  if (marca)
    return (
      <Page size={A5} style={[s.pagina, { padding: 0, paddingBottom: 0, backgroundColor: bss.degrade[1] }]}>
        <View style={{ position: "absolute", top: 0, left: 0, width: A5[0], height: A5[1] }} fixed>
          <Degrade w={A5[0]} h={A5[1]} />
          <Brilhos w={A5[0]} h={A5[1]} />
        </View>
        <View style={{ flexGrow: 1, justifyContent: "center", padding: M }}>
          <Text style={[s.titulo, { color: branco, fontSize: secao.estilo === "capa" ? 36 : 30, lineHeight: 1.08 }]}>{secao.titulo}</Text>
          {secao.subtitulo && <Text style={[s.subtitulo, { color: lilas, fontSize: 14 }]}>{secao.subtitulo}</Text>}
          {secao.imagem && <View style={{ marginTop: 18 }}><FotoPdf {...secao.imagem} w={A5[0] - 2 * M} h={220} /></View>}
          <Blocos blocos={secao.blocos} studio={studio} sobreMarca />
        </View>
        {rodape}
      </Page>
    );
  return (
    <Page size={A5} style={s.pagina}>
      <Text style={s.marcador}>{n} de {total}</Text>
      <Text style={s.titulo}>{secao.titulo}</Text>
      {secao.subtitulo && <Text style={s.subtitulo}>{secao.subtitulo}</Text>}
      {secao.imagem && <View style={{ marginTop: 12 }}><FotoPdf {...secao.imagem} w={A5[0] - 2 * M} h={135} /></View>}
      <View style={s.cartao}><Blocos blocos={secao.blocos} studio={studio} /></View>
      {rodape}
    </Page>
  );
}

/** Documento completo: uma página por seção. */
export function paginasDoDocumento(doc: Documento, studio: Studio) {
  return doc.secoes.map((sec, i) => <PaginaSecao key={sec.id} secao={sec} n={i + 1} total={doc.secoes.length} studio={studio} doc={doc} />);
}
