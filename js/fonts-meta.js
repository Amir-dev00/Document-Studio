/* Font catalog for the editor selector — matches download-fonts.ps1 families */
window.DocumentStudioFonts = {
  groups: [
    {
      id: 'persian',
      label: 'Persian',
      families: ['Vazirmatn', 'Estedad', 'Lalezar', 'Rakkas', 'Katibeh']
    },
    {
      id: 'arabic',
      label: 'Arabic / Urdu',
      families: [
        'Noto Sans Arabic', 'Noto Naskh Arabic', 'Noto Kufi Arabic', 'Noto Nastaliq Urdu',
        'Amiri', 'Amiri Quran', 'Cairo', 'Tajawal', 'Almarai', 'Alexandria',
        'IBM Plex Sans Arabic', 'Readex Pro', 'Markazi Text', 'Changa', 'El Messiri',
        'Reem Kufi', 'Reem Kufi Fun', 'Mada', 'Harmattan', 'Lateef', 'Mirza',
        'Aref Ruqaa', 'Aref Ruqaa Ink', 'Scheherazade New', 'Baloo Bhaijaan 2'
      ]
    },
    {
      id: 'latin',
      label: 'Latin',
      families: [
        'Inter', 'Roboto', 'Open Sans', 'Montserrat', 'Poppins', 'Lato', 'Nunito Sans',
        'Manrope', 'DM Sans', 'Source Sans 3', 'Merriweather', 'Lora', 'Playfair Display',
        'Libre Baskerville', 'Source Serif 4', 'Roboto Slab'
      ]
    }
  ],
  all() {
    const seen = new Set();
    const out = [];
    this.groups.forEach(g => g.families.forEach(f => {
      if (!seen.has(f)) { seen.add(f); out.push({ name: f, group: g.id, label: g.label }); }
    }));
    return out;
  },
  stack(name) {
    const q = /[\s"]/.test(name) ? `"${name}"` : name;
    return `${q}, ui-sans-serif, system-ui, sans-serif`;
  }
};
