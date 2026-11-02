"""Two hundred structured print configurations; the same metadata drives the picker and A4 renderer."""
NAMES = [
    ('ایبک کلاسیک', 'classic', '#147d78', 'center', 'solid', 'striped'),
    ('جراحی امضادار', 'signature', '#853c57', 'split', 'double', 'plain'),
    ('مینیمال کلینیک', 'minimal', '#334155', 'left', 'none', 'rules'),
    ('هندسهٔ آبی', 'geometric', '#2454a5', 'band', 'solid', 'grid'),
    ('قاب زمرد', 'emerald', '#12705a', 'split', 'frame', 'striped'),
    ('خط عمودی', 'rail', '#725239', 'rail', 'none', 'rules'),
    ('مهر سلطنتی', 'royal', '#63448b', 'center', 'double', 'grid'),
    ('مدرن دو ستونه', 'columns', '#146984', 'split', 'solid', 'plain'),
    ('کارت‌های بالینی', 'cards', '#485aa0', 'left', 'round', 'striped'),
    ('نسخهٔ تایپوگرافیک', 'editorial', '#303a3a', 'band', 'none', 'rules'),
    ('طرح اطفال', 'pediatric', '#a15a1c', 'center', 'round', 'plain'),
    ('خطوط دقیق', 'precision', '#316465', 'rail', 'double', 'grid'),
    ('کتابچهٔ داکتر', 'notebook', '#466444', 'left', 'frame', 'rules'),
    ('ترکیب آجری', 'terracotta', '#a1523e', 'split', 'round', 'grid'),
    ('مدال شفاخانه', 'medallion', '#715f30', 'center', 'frame', 'plain'),
    ('نواری دیجیتال', 'digital', '#3058b0', 'band', 'double', 'striped'),
    ('مونوکروم حرفه‌ای', 'mono', '#141414', 'rail', 'solid', 'plain'),
    ('آرامش یاسی', 'lilac', '#775b84', 'left', 'round', 'grid'),
    ('افق ایبک', 'horizon', '#296a88', 'split', 'none', 'rules'),
    ('آرشیف استاندارد', 'archive', '#46505d', 'center', 'solid', 'grid'),
]
TEMPLATES = [dict(id=i, name=name, slug=slug, color=color, header=header, border=border, table=table,
                  footer=('columns', 'center', 'line', 'split')[i % 4], density=('normal', 'compact', 'airy')[i % 3])
             for i, (name, slug, color, header, border, table) in enumerate(NAMES, 1)]

# Preserve IDs 1..20 so existing documents keep their original layout identity.
# Extended IDs represent a layout system, not 200 hand-illustrated unique artworks.
COLLECTIONS = [
    ('heritage', 'میراث ایبک', '#147d78'), ('surgical', 'جراحی دقیق', '#8c4659'),
    ('editorial', 'نوشتار پزشکی', '#374657'), ('nordic', 'آرامش شمال', '#46766f'),
    ('architect', 'هندسهٔ نو', '#3e6094'), ('botanical', 'سبز بالینی', '#4d7152'),
    ('atelier', 'آتلیهٔ نسخ', '#795784'), ('executive', 'امضای رسمی', '#7b643f'),
    ('minimal', 'مینیمال نو', '#4d6470'), ('horizon', 'افق شفاخانه', '#2b778a'),
]
for index, template in enumerate(TEMPLATES):
    template.update(collection='heritage', collection_name='میراث ایبک', ornament='plain', typography='sans')
for edition in range(1, 10):
    code, label, color = COLLECTIONS[edition]
    for position in range(20):
        base = NAMES[position]
        TEMPLATES.append(dict(
            id=edition * 20 + position + 1, name=f'{label} · {base[0]}', slug=base[1], color=color,
            header=('center','split','left','band','rail')[(position + edition) % 5],
            border=('solid','double','frame','round','none')[(position // 4 + edition) % 5],
            table=('striped','plain','rules','grid')[(position + edition // 2) % 4],
            footer=('columns','center','line','split')[(position // 5 + edition) % 4],
            density=('normal','compact','airy')[(position + edition) % 3],
            ornament=('corner','ribbon','ledger','seal','bracket','hatch','capsule','offset','fine')[edition - 1],
            typography=('sans','serif','mono')[position % 3], collection=code, collection_name=label,
        ))
