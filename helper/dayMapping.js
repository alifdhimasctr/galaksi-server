// helpers/dayMapping.js
const DAY_NAME_TO_NUM = {
    // en + id – semuanya lower‑case
    minggu: 0, senin: 1, selasa: 2, rabu: 3,
    kamis: 4, jumat: 5, sabtu: 6,
  };
  
  /**
   * Dapatkan tanggal berikutnya yg cocok dgn daftar `dayNums`.
   * Jika `allowSameDay=true` dan hari ini cocok, kembalikan hari ini.
   */
  function nextMatchingDate(start, dayNums, allowSameDay = false) {
    const d = new Date(start);
  
    // Kalau hari ini cocok & diizinkan, langsung pulang
    if (allowSameDay && dayNums.includes(d.getDay())) return d;
  
    // Jika tidak, maju 1 hari sampai ketemu
    do {
      d.setDate(d.getDate() + 1);
    } while (!dayNums.includes(d.getDay()));
  
    return d;
  }
  
  module.exports = { DAY_NAME_TO_NUM, nextMatchingDate };
  