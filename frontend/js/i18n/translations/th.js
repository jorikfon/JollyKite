/**
 * การแปลภาษาไทยสำหรับ JollyKite
 */
export default {
  // ทั่วไป
  app: {
    title: 'ปากน้ำปราณ ไคท์เซิร์ฟ - พยากรณ์ลม 🏄‍♂️',
    description: 'พยากรณ์ลมและสภาพการไคท์เซิร์ฟที่ปากน้ำปราณ ประเทศไทย ข้อมูลลมสด ข้อมูลความปลอดภัย และสภาพอากาศสำหรับนักไคท์เซิร์ฟ',
    subtitle: 'ข้อมูลลมแบบเรียลไทม์',
    loading: 'กำลังโหลด...',
    error: 'ข้อผิดพลาด',
    retry: 'ลองใหม่',
    footer: '© 2025 ปากน้ำปราณ. สร้างด้วย ❤️ สำหรับนักไคท์เซิร์ฟ',
  },

  // เมนูการตั้งค่า
  menu: {
    title: 'การตั้งค่า',
    language: 'ภาษา',
    units: 'หน่วยความเร็วลม',
    notifications: 'การแจ้งเตือน',
    riderPreferences: 'การตั้งค่านักเล่น',
    boardType: 'ประเภทบอร์ด',
    twintip: 'ทวินทิป',
    hydrofoil: 'ไคท์ฟอยล์',
    wingfoil: 'วิงฟอยล์',
    riderWeight: 'น้ำหนักนักเล่น (กก.)',
    weightHint: 'ใช้สำหรับคำนวณขนาดว่าวที่เหมาะสม',
    close: 'ปิด',
  },

  // หน่วย
  units: {
    knots: 'นอต',
    metersPerSecond: 'เมตรต่อวินาที',
    knotsShort: 'kn',
    msShort: 'm/s',
  },

  // ทิศทางลม
  wind: {
    directions: {
      N: 'เหนือ',
      NE: 'ตะวันออกเฉียงเหนือ',
      E: 'ตะวันออก',
      SE: 'ตะวันออกเฉียงใต้',
      S: 'ใต้',
      SW: 'ตะวันตกเฉียงใต้',
      W: 'ตะวันตก',
      NW: 'ตะวันตกเฉียงเหนือ',
    },
    categories: {
      calm: {
        title: 'สงบ',
        subtitle: 'ไม่มีลม',
      },
      light: {
        title: 'ลมเบา',
        subtitle: 'เหมาะสำหรับผู้เริ่มต้น',
      },
      moderate: {
        title: 'ลมปานกลาง',
        subtitle: 'สภาพที่สมบูรณ์แบบ!',
      },
      strong: {
        title: 'ลมแรง',
        subtitle: 'สำหรับนักเล่นที่มีประสบการณ์',
      },
      extreme: {
        title: 'ลมรุนแรง',
        subtitle: 'อันตราย!',
      },
    },
    safety: {
      veryWeak: 'ลมอ่อนมาก',
      weak: 'ลมอ่อน',
      moderate: 'ปานกลาง',
      good: 'สภาพดี',
      excellent: 'สภาพที่สมบูรณ์แบบ!',
      dangerous: 'อันตราย!',
    },
  },

  // แนวโน้ม
  trends: {
    loading: 'กำลังโหลด...',
    noData: 'ไม่มีข้อมูล',
    stable: 'คงที่',
    increasing: 'เพิ่มขึ้น',
    decreasing: 'ลดลง',
    veryStable: 'คงที่มาก',
    slightlyIncreasing: 'เพิ่มขึ้นเล็กน้อย',
    slightlyDecreasing: 'ลดลงเล็กน้อย',
    for30min: 'มากกว่า 30 นาที',
    accumulatingData: 'กำลังรวบรวมข้อมูล...',
    strengthening: 'แรงขึ้น',
    weakening: 'อ่อนลง',
    directionStable: 'ทิศทางคงที่',
    directionVariable: 'ทิศทางแปรปรวน',
    directionChanging: 'ทิศทางเปลี่ยน',
  },

  // การแจ้งเตือน
  notifications: {
    subscribe: 'สมัครรับการแจ้งเตือนลม',
    unsubscribe: 'ยกเลิกการแจ้งเตือน',
    notSupported: 'ไม่รองรับการแจ้งเตือน',
    blocked: 'การแจ้งเตือนถูกบล็อก',
    subscribed: 'คุณได้สมัครแล้ว',
    notSubscribed: 'ยังไม่ได้สมัคร',
    enable: 'เปิดการแจ้งเตือน',
    disable: 'ปิดการแจ้งเตือน',
    description: 'รับการแจ้งเตือนเมื่อลมคงที่เหนือ 10 นอตเป็นเวลา 20 นาที (สูงสุดวันละ 1 ครั้ง)',
  },

  // พยากรณ์อากาศ
  forecast: {
    title: 'พยากรณ์ลม 3 วัน',
    today: 'วันนี้',
    tomorrow: 'พรุ่งนี้',
    dayAfterTomorrow: 'มะรืนนี้',
    hours: 'ชั่วโมง',
    wind: 'ลม',
    waves: 'คลื่น',
    rain: 'ฝน',
    maxWind: 'ลมสูงสุด',
    avgWind: 'ลมเฉลี่ย',
    noData: 'ไม่มีข้อมูลพยากรณ์',
  },

  // ประวัติ
  history: {
    todayTimeline: 'กราฟลมวันนี้',
    weekHistory: 'ประวัติลม 7 วัน',
    noData: 'ไม่มีข้อมูลประวัติ',
    average: 'เฉลี่ย',
    maximum: 'สูงสุด',
    minimum: 'ต่ำสุด',
    actual: 'ข้อมูลจริง',
    forecast: 'พยากรณ์',
    loadingError: 'ข้อผิดพลาดในการโหลด',
  },

  // คำแนะนำเกี่ยวกับเครื่อง
  kite: {
    recommendation: 'แนะนำขนาด',
    recommendationHint: '💡 ตัวเลขแสดงน้ำหนักนักเล่นที่แนะนำสำหรับสภาพปัจจุบัน',
    size: 'ขนาด',
    rider: 'นักเล่น',
    optimal: 'สมบูรณ์แบบ!',
    good: 'ดี',
    acceptable: 'พอใช้',
    tooSmall: 'เล็กเกินไป',
    tooLarge: 'ใหญ่เกินไป',
    tooLight: 'ลมเบา',
    tooStrong: 'ลมแรง',
    tooWeak: 'ลมอ่อนเกินไป',
    none: 'ไม่เหมาะสม',
    kg: 'กก.',
    optimalChoice: 'เหมาะสมที่สุด',
    // คำแนะนำตามสภาพลม
    veryWeak: '🏖️ ลมอ่อนเกินไปสำหรับไคท์เซิร์ฟ',
    lightWind: '💨 ลมเบา - ต้องใช้เครื่องใหญ่ (14-17ม.)',
    goodConditions: '✨ สภาพดี - เครื่องขนาดกลาง (11-14ม.)',
    excellentConditions: '🔥 สภาพดีเยี่ยม - เครื่องเล็ก (9-12ม.)',
    strongWind: '💪 ลมแรง - เครื่องเล็ก (8-9ม.)',
    veryStrong: '⚠️ ลมแรงมาก - สำหรับผู้มีประสบการณ์!',
  },

  // ข้อมูลลม
  info: {
    currentWind: 'ลมปัจจุบัน',
    speed: 'ความเร็ว',
    direction: 'ทิศทาง',
    gust: 'ลมกระโชก',
    maxGust: 'สูงสุดวันนี้',
    trend: 'แนวโน้ม',
    lastUpdate: 'อัปเดตล่าสุด',
    live: 'ถ่ายทอดสด',
    ago: 'ที่แล้ว',
    secondsAgo: 'วินาทีที่แล้ว',
    minutesAgo: 'นาทีที่แล้ว',
    at: 'เวลา',
    stationOffline: 'สถานีออฟไลน์',
    offlineNoticeText: 'ข้อมูลลมถูกรวบรวมเฉพาะเวลา <strong>6:00 ถึง 19:00</strong> (เวลาไทย)<br>กรุณากลับมาในช่วงเวลาทำการ',
    offshore: 'ลมจากฝั่ง',
    onshore: 'ลมเข้าฝั่ง',
    sideshore: 'ลมข้าง',
    dangerOffshore: '⚠️ อันตราย • ลมจากฝั่ง',
  },

  // วันในสัปดาห์
  days: {
    monday: 'วันจันทร์',
    tuesday: 'วันอังคาร',
    wednesday: 'วันพุธ',
    thursday: 'วันพฤหัสบดี',
    friday: 'วันศุกร์',
    saturday: 'วันเสาร์',
    sunday: 'วันอาทิตย์',
    mon: 'จ',
    tue: 'อ',
    wed: 'พ',
    thu: 'พฤ',
    fri: 'ศ',
    sat: 'ส',
    sun: 'อา',
  },

  // เดือน
  months: {
    january: 'มกราคม',
    february: 'กุมภาพันธ์',
    march: 'มีนาคม',
    april: 'เมษายน',
    may: 'พฤษภาคม',
    june: 'มิถุนายน',
    july: 'กรกฎาคม',
    august: 'สิงหาคม',
    september: 'กันยายน',
    october: 'ตุลาคม',
    november: 'พฤศจิกายน',
    december: 'ธันวาคม',
  },

  // เวลาทำการ
  workingHours: {
    title: 'เวลาทำการ',
    open: 'เปิด',
    closed: 'ปิด',
    opensAt: 'เปิดเวลา',
    closesAt: 'ปิดเวลา',
  },
};
