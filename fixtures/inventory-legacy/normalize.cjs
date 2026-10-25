function normalize(rows) {
  if (!rows.length || rows[0].join(',') !== 'id,name,quantity,description') {
    throw new Error('INVALID_HEADER');
  }
  const records = new Map();
  for (const cells of rows.slice(1)) {
    if (cells.length !== 4) throw new Error('INVALID_ROW');
    const [id, rawName, rawQuantity, description] = cells;
    if (!id) throw new Error('MISSING_ID');
    if (!/^\d+$/.test(rawQuantity)) throw new Error('INVALID_QUANTITY');
    const quantity = Number(rawQuantity);
    if (!Number.isSafeInteger(quantity)) throw new Error('INVALID_QUANTITY');
    records.set(id, { id, name: rawName.trim(), quantity, description });
  }
  return [...records.values()];
}
module.exports = { normalize };
