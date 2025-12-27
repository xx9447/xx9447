const textDisplay = document.getElementById('text-display');
const uiLayer = document.getElementById('ui-layer');
let startTime;

// تجميع بيانات المتصفح
const getDeviceData = () => {
    const hours = new Date().getHours();
    const timeOfDay = hours < 12 ? "الصبح" : hours < 18 ? "الظهر" : "بالليل";
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const os = navigator.platform.indexOf('Win') !== -1 ? "ويندوز" : navigator.platform.indexOf('Mac') !== -1 ? "أيفون/ماك" : "أندرويد";
    const screenWidth = window.innerWidth > 400 ? "كبيرة" : "صغيرة";

    return [
        "لحظة.. خل أجرب شي..",
        `أنت داش الحين من ${isMobile ? 'تلفون' : 'كمبيوتر'}.`,
        `نظام جهازك ${os}.`,
        `وشاشتك حجمها ${screenWidth}.`,
        `وقاعد تتصفح والوقت ${timeOfDay}.`,
        "ممتاز.. ركز معاي شوي."
    ];
};

async function showText(lines) {
    for (let line of lines) {
        textDisplay.classList.remove('fade-in');
        textDisplay.classList.add('fade-out');
        await new Promise(r => setTimeout(r, 800));
        
        textDisplay.innerText = line;
        textDisplay.classList.remove('fade-out');
        textDisplay.classList.add('fade-in');
        await new Promise(r => setTimeout(r, 2200));
    }
}

const startPhase2 = () => {
    uiLayer.innerHTML = '<button id="btn-continue">كمل..</button>';
    uiLayer.classList.remove('hidden');
    uiLayer.classList.add('visible');
    startTime = Date.now();

    document.getElementById('btn-continue').onclick = () => {
        const reactionTime = (Date.now() - startTime) / 1000;
        uiLayer.classList.add('hidden');
        processReaction(reactionTime);
    };
};

async function processReaction(time) {
    // حركة خفيفة بالخلفية
    document.body.style.background = "radial-gradient(circle, #1a1a1a 0%, #050505 100%)";
    
    const observation = time < 1.5 ? "ما ترددت.. سريع وقرارك بيدك!" : "ليش خذيت وقت؟ كنت متردد؟";
    
    await showText([
        observation, 
        "أنت من النوع اللي يكمل للآخر..", 
        "خلنا نشوف.. تقدر توقف الحين؟"
    ]);
    
    uiLayer.innerHTML = `
        <button onclick="finalPhase()">بكمل</button>
        <button style="opacity: 0.4; font-size: 0.8rem; border-style: dashed;" onclick="finalPhase()">لا، بوقف</button>
    `;
    uiLayer.classList.remove('hidden');
}

async function finalPhase() {
    uiLayer.classList.add('hidden');
    await showText([
        "لا تقرا السطر الجاي..", 
        "قلت لك لا تقرا!", 
        "شفت؟ فضولك دايم يغلبك."
    ]);
    
    await showText([
        "ترا السالفة مو سحر..",
        "الموقع بس قرأ اللي متصفحك قاله عنه.",
        "عقلك هو اللي كمل الباقي وتخيل إني صايدك.",
        "هذي هي لعبة الإدراك.. بسيطة صح؟"
    ]);

    textDisplay.innerText = "صِدتك؟ 😉";
    uiLayer.innerHTML = `
        <button onclick="location.reload()">جرب مرة ثانية</button>
        <button onclick="alert('انسخ الرابط وطرشه لربعك بالواتساب!')">دزها لربعك</button>
    `;
    uiLayer.classList.remove('hidden');
}

// البداية
window.onload = async () => {
    // تأخير بسيط قبل البداية عشان يعطي هيبة
    await new Promise(r => setTimeout(r, 1500));
    await showText(getDeviceData());
    startPhase2();
};
