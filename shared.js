// ملف مشترك بين صفحة "شهادة التقدير" وصفحة "أرشيف الفائزين"
// بيستخدم نفس رابط جوجل شيت ونفس منطق حساب الفائز الموجود في index.html بالظبط، عشان
// النتيجة تفضل متطابقة 100% مع لوحة الصدارة الأساسية.

const CLOUD_STORAGE_URL = "https://script.google.com/macros/s/AKfycbz4FxH_vdQotKg08neIk6Cj4-Hrc3jcBJPvCrAfgBHyarRUGet77L0-V7J6vnrTZaAZ/exec";
const TARGET_SHEET_NAME = "لوحة اختيار الموظف المثالي";

const evaluatorRoles = [
    { key: 'manager', label: 'مدير الإدارة (محمد مصطفي)' },
    { key: 'deputy1', label: 'النائب (محمد يسري)' },
    { key: 'deputy2', label: 'النائب (سعد محمد)' },
    { key: 'tl_first', label: 'رئيس الفريق الأول' },
    { key: 'tl_second', label: 'رئيس الفريق الثاني' },
    { key: 'tl_third', label: 'رئيس الفريق الثالث' },
    { key: 'tl_stock', label: 'تيم ليدر مجموعة المخزون' },
    { key: 'tl_finance', label: 'تيم ليدر المجموعة المالية' },
    { key: 'tl_special', label: 'تيم ليدر الإدارات المتخصصة' }
];

const defaultEmployeesDataset = [
    { id: 122, name: "ياسر أحمد" }, { id: 236, name: "السيد ناصر" }, { id: 942, name: "أحمد خميس" },
    { id: 3954, name: "عماد جمال" }, { id: 4795, name: "وائل علي" }, { id: 5078, name: "مصطفى عبد الحميد" },
    { id: 5328, name: "إسلام عبد العزيز" }, { id: 5483, name: "أشرف أحمد" }, { id: 5846, name: "أحمد علم الدين" },
    { id: 6208, name: "محمد ياقوت" }, { id: 7099, name: "أحمد السيد يوسف" }, { id: 7195, name: "محمد أبو الحسن" },
    { id: 7483, name: "محمد ربيع" }, { id: 10106, name: "محمود إبراهيم" }, { id: 10258, name: "محمود أحمد علي" },
    { id: 10384, name: "محمد عزت" }, { id: 10513, name: "محمد سليمان" }, { id: 11349, name: "أحمد الشعراوى" },
    { id: 11627, name: "أحمد الدليل" }, { id: 13329, name: "محمد منصور" }, { id: 14683, name: "كريم كامل" },
    { id: 16188, name: "محمد عبد الوهاب" }, { id: 16190, name: "إسلام حمدي" }, { id: 16936, name: "محمد سمير" },
    { id: 22903, name: "مصطفى يوسف" }, { id: 25518, name: "إبراهيم السيد" },
    { id: 18947, name: "أمل محمد" }, { id: 27685, name: "رحمة محمود" }
];

const arabicMonths = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

// نفس نظام الهوية الموجود في index.html بالظبط (بيستخدم نفس مفاتيح localStorage)،
// فلو حد سجل هويته من الصفحة الرئيسية، هوية بتفضل شغالة هنا كمان من غير ما يعمل أي حاجة تانية.
function getViewerRole() {
    return localStorage.getItem('GomlaAudit_ViewerRole') || '';
}
function isFullAccessViewer() {
    if (!getViewerRole()) return false;
    return localStorage.getItem('GomlaAudit_ViewerFullAccess') === '1';
}

// جلب الأرشيف الكامل من السيرفر (نفس أسلوب JSONP الموجود في index.html)
function fetchArchive(callback) {
    const cbName = '__archiveCallback_' + Date.now();
    window[cbName] = function(response) {
        delete window[cbName];
        callback(response && response.archive ? response.archive : {});
    };
    const script = document.createElement('script');
    script.src = CLOUD_STORAGE_URL + "?action=get&sheet=" + encodeURIComponent(TARGET_SHEET_NAME) + "&callback=" + cbName;
    script.onerror = function() { callback({}); };
    document.body.appendChild(script);
}

function getEmployeesFromArchive(archive) {
    if (archive._meta && Array.isArray(archive._meta.employees) && archive._meta.employees.length > 0) {
        return archive._meta.employees;
    }
    return defaultEmployeesDataset;
}

// نفس منطق ترتيب الفوز الموجود في index.html بالظبط:
// 1) أعلى عدد مقيّمين  2) أعلى متوسط  3) تقييم مدير الإدارة كفيصل أخير عند التعادل التام
function computeMonthRanking(archive, monthKey) {
    const employees = getEmployeesFromArchive(archive);
    const monthData = archive[monthKey] || {};

    let list = employees.map(emp => {
        const rec = monthData[emp.id] || null;
        let tot = 0, count = 0;

        if (rec && rec.scores) {
            evaluatorRoles.forEach(r => {
                if (r.key === 'manager') return;
                if (rec.scores[r.key] !== undefined && rec.scores[r.key] > 0) {
                    tot += rec.scores[r.key];
                    count++;
                }
            });
        }

        return { emp, rec, avg: count > 0 ? (tot / count).toFixed(2) : "0.00", count };
    });

    list.sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        if (parseFloat(b.avg) !== parseFloat(a.avg)) return parseFloat(b.avg) - parseFloat(a.avg);
        const aManager = (a.rec && a.rec.scores && a.rec.scores.manager) || 0;
        const bManager = (b.rec && b.rec.scores && b.rec.scores.manager) || 0;
        return bManager - aManager;
    });

    return list;
}

function computeMonthWinner(archive, monthKey) {
    const ranking = computeMonthRanking(archive, monthKey);
    if (ranking.length === 0 || ranking[0].count === 0) return null;
    return ranking[0];
}
