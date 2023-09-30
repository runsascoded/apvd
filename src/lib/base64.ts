export const b64i2c =
    '01234567' + '89abcdef' +
    'ghijklmn' + 'opqrstuv' +
    'wxyzABCD' + 'EFGHIJKL' +
    'MNOPQRST' + 'UVWXYZ-_'
export const b64c2i: { [c: string]: number } = {}
b64i2c.split('').forEach((c, i) => {
    b64c2i[c] = i
})
