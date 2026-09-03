# Design System V1

Defterdar'ın mevcut defter hissini koruyan bu katman, yeni görsel dil icat etmek yerine ortak kararları tek bir sözlükte toplar. Tokenların kaynağı `apps/web/app/styles/tokens-base.css` dosyasıdır.

## İlkeler

- Arayüzün yaklaşık yüzde 80'i sakin `canvas`, `base` ve `sunken` yüzeylerden oluşur. Marka ve vurgu renkleri kalan yüzde 20'de eylem, seçim ve yönlendirme için kullanılır.
- Soft-3D etkisi tek bir iç ışık ve üç yükselti seviyesiyle sınırlıdır. Yüksek gölge yalnızca dialog ve açılır menü gibi gerçek katmanlarda kullanılır.
- Renk, durumun tek göstergesi değildir. Durum chip'leri metin/ikon etiketini korur; semantic state tokenları yalnızca görsel eşliği sağlar.
- Yeni bileşenler ham hex, rastgele radius veya gölge eklemek yerine aşağıdaki semantic rolleri kullanır.

## Token sözlüğü

| Alan      | Roller                                                                      | Kullanım                                                                |
| --------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Renk      | `color-brand`, `color-accent`, `color-highlight`                            | Kimlik, birincil eylem, vurgu                                           |
| Tipografi | `font-size-*`, `font-weight-*`, `line-height-*`                             | Ortak metin ölçeği ve ritmi                                             |
| Spacing   | `space-*`, `layout-*-gap`                                                   | İç/dış boşluk ve sayfa ritmi                                            |
| Border    | `border-width*`, `border-color*`                                            | Kontrol ve yüzey ayrımı                                                 |
| Radius    | `radius-control`, `radius-surface`, `radius-dialog`, `radius-pill`          | Forma göre köşe karakteri                                               |
| Elevation | `elevation-highlight`, `elevation-1..3`, `elevation-control*`               | Kontrollü soft-3D ve katmanlama                                         |
| Focus     | `focus-ring-*`, `focus-field-halo`                                          | Klavye odağı ve form odağı                                              |
| Motion    | `motion-*`, `ease-*`                                                        | Durum geçişleri; hareket dosyasındaki reduced-motion kuralıyla birlikte |
| Surface   | `surface-canvas`, `sunken`, `subtle`, `base`, `raised`, `strong`, `overlay` | Arka plandan modal katmanına hiyerarşi                                  |
| State     | `state-neutral/success/info/warning/critical/muted-*`                       | Durum metni, zemini ve sınırı                                           |

## Bileşen sözleşmesi

- Button: `button` tabanı ile `primary`, `quiet` veya `paper` varyantı kullanılır. Hover yükselir, active başlangıç seviyesine döner, disabled ortak opacity kullanır.
- Input: `input` sınıfı control radius, semantic border, base surface ve field focus halo kullanır.
- Chip: nötr durum varsayılandır; active, completed ve archived varyantları semantic state rolleriyle eşlenir.
- Surface: içerik kartlarında `surface-raised + elevation-1`, açılır katmanlarda `surface-raised + elevation-3`, dialogda `surface-subtle + elevation-3` kullanılır.

Eski `color-*`, `shadow-paper` ve `shadow-raised` değişkenleri mevcut ekranların geriye uyumu için korunmuştur; yeni çalışma semantic rolleri tercih etmelidir.
