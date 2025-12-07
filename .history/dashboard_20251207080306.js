// ==========================================
// KONFIGURASI
// ==========================================
// Paste URL Google Apps Script Bapak di sini:
const API_URL = "TEMPEL_URL_SCRIPT_AKHIRAN_EXEC_DISINI";

let rawData = []; // Menyimpan data mentah dari server
let chartInstance = null; // Menyimpan instance grafik

// Saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    loadData();
});

// ==========================================
// FUNGSI UTAMA: LOAD DATA
// ==========================================
async function loadData() {
    const loading = document.getElementById('loading');
    const empty = document.getElementById('empty');
    const tableBody = document.getElementById('tableBody');

    // Reset UI
    tableBody.innerHTML = '';
    loading.style.display = 'block';
    empty.style.display = 'none';

    try {
        // Fetch data dengan timestamp agar tidak dicache browser
        const response = await fetch(`${API_URL}?t=${new Date().getTime()}`);
        const data = await response.json();

        loading.style.display = 'none';

        if (!data || data.length === 0) {
            empty.style.display = 'block';
            updateStats([]);
            return;
        }

        // Simpan data ke variabel global & Bersihkan format nilai
        rawData = data.map(item => {
            // Bersihkan tanda kutip pada nilai jika ada ("'80" -> 80)
            let cleanScore = parseInt(item.nilai.toString().replace(/['"]/g, ''));
            return {
                waktu: new Date(item.waktu),
                nama: item.nama,
                nilai: isNaN(cleanScore) ? 0 : cleanScore
            };
        });

        // Jalankan fungsi-fungsi render
        updateStats(rawData);
        renderChart(rawData);
        applySort(); // Ini akan memanggil renderTable juga

    } catch (error) {
        console.error("Error:", error);
        loading.innerHTML = "Gagal koneksi ke server. Coba refresh.";
    }
}

// ==========================================
// LOGIKA SORTING & FILTER
// ==========================================
function applySort() {
    const sortValue = document.getElementById('sortFilter').value;
    let sortedData = [...rawData]; // Copy array agar master data tidak rusak

    // Logika Pengurutan
    sortedData.sort((a, b) => {
        if (sortValue === 'time_desc') return b.waktu - a.waktu; // Terbaru
        if (sortValue === 'time_asc') return a.waktu - b.waktu;  // Terlama (Tercepat submit)
        if (sortValue === 'score_desc') return b.nilai - a.nilai; // Nilai Tinggi
        if (sortValue === 'score_asc') return a.nilai - b.nilai;  // Nilai Rendah
    });

    applySearch(sortedData);
}

function applySearch(dataToRender = null) {
    const query = document.getElementById('searchInput').value.toLowerCase();

    // Jika dataToRender null, berarti dipanggil langsung dari input search, ambil dari rawData yg sudah disort
    let sourceData = dataToRender || rawData;

    // Namun untuk konsistensi sorting saat search, kita panggil sort dulu
    if (!dataToRender) {
        const sortValue = document.getElementById('sortFilter').value;
        sourceData = [...rawData].sort((a, b) => {
            if (sortValue === 'time_desc') return b.waktu - a.waktu;
            if (sortValue === 'time_asc') return a.waktu - b.waktu;
            if (sortValue === 'score_desc') return b.nilai - a.nilai;
            if (sortValue === 'score_asc') return a.nilai - b.nilai;
        });
    }

    const filtered = sourceData.filter(item => item.nama.toLowerCase().includes(query));
    renderTable(filtered);
}

// ==========================================
// RENDER TABEL
// ==========================================
function renderTable(data) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    data.forEach((row, index) => {
        const tr = document.createElement('tr');

        // Format Waktu: 07 Des, 10:30
        const timeString = row.waktu.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) +
            ', ' + row.waktu.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        // Tentukan Badge
        const statusBadge = row.nilai >= 75
            ? `<span class="badge badge-pass">Lulus</span>`
            : `<span class="badge badge-fail">Remedial</span>`;

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td style="color: var(--text-muted); font-size: 0.9rem;">${timeString}</td>
            <td style="font-weight: 600;">${row.nama}</td>
            <td style="font-weight: 700;">${row.nilai}</td>
            <td>${statusBadge}</td>
        `;
        tableBody.appendChild(tr);
    });
}

// ==========================================
// UPDATE STATISTIK & GRAFIK
// ==========================================
function updateStats(data) {
    const total = data.length;
    if (total === 0) return;

    // Hitung rata-rata
    const sum = data.reduce((acc, curr) => acc + curr.nilai, 0);
    const avg = Math.round(sum / total);

    // Cari nilai tertinggi
    const max = Math.max(...data.map(item => item.nilai));

    // Update UI
    document.getElementById('totalSiswa').innerText = total;
    document.getElementById('rataRata').innerText = avg;
    document.getElementById('nilaiTertinggi').innerText = max;
}

function renderChart(data) {
    const ctx = document.getElementById('scoreChart').getContext('2d');

    // Kategorikan Nilai (Range)
    let rangeA = 0; // 85 - 100
    let rangeB = 0; // 70 - 84
    let rangeC = 0; // < 70

    data.forEach(item => {
        if (item.nilai >= 85) rangeA++;
        else if (item.nilai >= 70) rangeB++;
        else rangeC++;
    });

    // Hapus chart lama jika ada (untuk refresh)
    if (chartInstance) chartInstance.destroy();

    // Buat Chart Baru
    chartInstance = new Chart(ctx, {
        type: 'doughnut', // Tipe Chart: Pie/Doughnut
        data: {
            labels: ['Sangat Baik (>85)', 'Baik (70-84)', 'Perlu Bimbingan (<70)'],
            datasets: [{
                data: [rangeA, rangeB, rangeC],
                backgroundColor: [
                    '#10b981', // Hijau
                    '#f59e0b', // Orange
                    '#ef4444'  // Merah
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { usePointStyle: true, padding: 20 }
                }
            }
        }
    });
}