export interface ProvinceData {
  id: number;
  nameEn: string;
  nameNp: string;
  districts: DistrictData[];
}

export interface DistrictData {
  nameEn: string;
  nameNp: string;
  municipalities: MunicipalityData[];
}

export interface MunicipalityData {
  nameEn: string;
  nameNp: string;
  type: 'Metro' | 'Sub-Metro' | 'Municipality';
  wards: number[];
  popularAreas?: string[];
}

export interface CampusMarker {
  nameEn: string;
  nameNp: string;
  city: string;
  district: string;
  lat: number;
  lng: number;
  studentsCount: string;
  type?: 'University' | 'College' | 'Institute';
}

export const NEPAL_PROVINCES: ProvinceData[] = [
  // ==================== 1. KOSHI PROVINCE ====================
  {
    id: 1,
    nameEn: 'Koshi Province',
    nameNp: 'कोशी प्रदेश',
    districts: [
      {
        nameEn: 'Morang',
        nameNp: 'मोरङ',
        municipalities: [
          { nameEn: 'Biratnagar Metropolitan City', nameNp: 'विराटनगर महानगरपालिका', type: 'Metro', wards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
          { nameEn: 'Belbari Municipality', nameNp: 'बेलबारी नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Letang Municipality', nameNp: 'लेटाङ नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5, 6] },
          { nameEn: 'Pathari Sanischare Municipality', nameNp: 'पथारी सानिसचारे नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Rangeli Municipality', nameNp: 'रङ्गेली नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
          { nameEn: 'Ratuwamai Municipality', nameNp: 'रातुवामै नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
          { nameEn: 'Sunawarshi Municipality', nameNp: 'सुनावर्शी नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Urlabari Municipality', nameNp: 'उर्लाबारी नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
        ]
      },
      {
        nameEn: 'Sunsari',
        nameNp: 'सुनसरी',
        municipalities: [
          { nameEn: 'Dharan Sub-Metropolitan City', nameNp: 'धरान उपमहानगरपालिका', type: 'Sub-Metro', wards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
          { nameEn: 'Itahari Sub-Metropolitan City', nameNp: 'इटहरी उपमहानगरपालिका', type: 'Sub-Metro', wards: [1, 2, 3, 4, 5, 6] },
          { nameEn: 'Barahachhetra Municipality', nameNp: 'बराहक्षेत्र नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
          { nameEn: 'Duhabi Municipality', nameNp: 'दुहबी नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
          { nameEn: 'Inaruwa Municipality', nameNp: 'इनरुवा नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Ramdhuni Municipality', nameNp: 'रामधुनी नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
        ]
      },
      {
        nameEn: 'Jhapa',
        nameNp: 'झापा',
        municipalities: [
          { nameEn: 'Birtamod Municipality', nameNp: 'बिर्तामोड नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Bhadrapur Municipality', nameNp: 'भद्रपुर नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Damak Municipality', nameNp: 'दमक नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5, 6] },
          { nameEn: 'Arjundhara Municipality', nameNp: 'अर्जुनधारा नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
          { nameEn: 'Kankai Municipality', nameNp: 'कन्काई नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5, 6] },
          { nameEn: 'Mechinagar Municipality', nameNp: 'मेचिनागर नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Shivasatakshi Municipality', nameNp: 'शिवसतक्षी नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
          { nameEn: 'Gauradaha Municipality', nameNp: 'गौरदाहा नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
        ]
      },
      {
        nameEn: 'Dhankuta',
        nameNp: 'धनकुटा',
        municipalities: [
          { nameEn: 'Dhankuta Municipality', nameNp: 'धनकुटा नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Pakhribas Municipality', nameNp: 'पाखरिबास नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
          { nameEn: 'Mahalaxmi Municipality', nameNp: 'महालक्ष्मी नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Ilam',
        nameNp: 'इलाम',
        municipalities: [
          { nameEn: 'Ilam Municipality', nameNp: 'इलाम नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Deumai Municipality', nameNp: 'देउमै नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Mai Municipality', nameNp: 'मै नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
          { nameEn: 'Suryodaya Municipality', nameNp: 'सूर्योदय नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Bhojpur',
        nameNp: 'भोजपुर',
        municipalities: [
          { nameEn: 'Bhojpur Municipality', nameNp: 'भोजपुर नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
          { nameEn: 'Shadanand Municipality', nameNp: 'शदानन्द नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Khotang',
        nameNp: 'खोटाङ',
        municipalities: [
          { nameEn: 'Diktel Rupakot Majhuwagadhi Municipality', nameNp: 'दिक्तेल रुपाकोट मझुवागढी नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Halesi Tuwachung Municipality', nameNp: 'हलेसी तुवाचुङ नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
        ]
      },
      {
        nameEn: 'Okhaldhunga',
        nameNp: 'ओखलढुङ्गा',
        municipalities: [
          { nameEn: 'Siddhicharan Municipality', nameNp: 'सिद्धिचरण नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
        ]
      },
      {
        nameEn: 'Panchthar',
        nameNp: 'पञ्चथर',
        municipalities: [
          { nameEn: 'Phidim Municipality', nameNp: 'फिडिम नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
        ]
      },
      {
        nameEn: 'Sankhuwasabha',
        nameNp: 'सङ्खुवसभा',
        municipalities: [
          { nameEn: 'Khandbari Municipality', nameNp: 'खनबारी नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Chainpur Municipality', nameNp: 'चैनपुर नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Dharmadevi Municipality', nameNp: 'धर्मदेवी नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Madi Municipality', nameNp: 'माडी नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Panchkhapan Municipality', nameNp: 'पञ्चखापन नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Solukhumbu',
        nameNp: 'सोलुखुम्बु',
        municipalities: [
          { nameEn: 'Solududhkunda Municipality', nameNp: 'सोलुदुधकुण्डा नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
        ]
      },
      {
        nameEn: 'Taplejung',
        nameNp: 'ताप्लेजुङ',
        municipalities: [
          { nameEn: 'Phungling Municipality', nameNp: 'फुन्लिङ नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
        ]
      },
      {
        nameEn: 'Terhathum',
        nameNp: 'तेरथुम',
        municipalities: [
          { nameEn: 'Myanglung Municipality', nameNp: 'म्यङ्लुङ नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Laligurans Municipality', nameNp: 'ललिगुरास नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Udayapur',
        nameNp: 'उदयपुर',
        municipalities: [
          { nameEn: 'Triyuga Municipality', nameNp: 'त्रिभुग नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Katari Municipality', nameNp: 'कतारी नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Chaudandigadhi Municipality', nameNp: 'चौदन्डीगढी नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Belaka Municipality', nameNp: 'बेलाका नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
    ]
  },

  // ==================== 2. MADHESH PROVINCE ====================
  {
    id: 2,
    nameEn: 'Madhesh Province',
    nameNp: 'मधेश प्रदेश',
    districts: [
      {
        nameEn: 'Parsa',
        nameNp: 'पर्सा',
        municipalities: [
          { nameEn: 'Birgunj Sub-Metropolitan City', nameNp: 'बिरगञ्ज उपमहानगरपालिका', type: 'Sub-Metro', wards: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
          { nameEn: 'Bahudarmai Municipality', nameNp: 'बहुदरमै नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Parsagadhi Municipality', nameNp: 'पर्सगढी नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
          { nameEn: 'Pokhariya Municipality', nameNp: 'पोखरिया नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Bara',
        nameNp: 'बारा',
        municipalities: [
          { nameEn: 'Kalaiya Sub-Metropolitan City', nameNp: 'कलैया उपमहानगरपालिका', type: 'Sub-Metro', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Jitpur Simara Sub-Metropolitan City', nameNp: 'जितपुर सिमरा उपमहानगरपालिका', type: 'Sub-Metro', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Kolhabi Municipality', nameNp: 'कोलहबी नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Mahagadhimai Municipality', nameNp: 'महागधिमै नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
          { nameEn: 'Nijgadh Municipality', nameNp: 'निज्गढ नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Pacharauta Municipality', nameNp: 'पचराउता नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Simraungadh Municipality', nameNp: 'सिमरौङ्गढ नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Dhanusha',
        nameNp: 'धनुषा',
        municipalities: [
          { nameEn: 'Janakpur Sub-Metropolitan City', nameNp: 'जनकपुर उपमहानगरपालिका', type: 'Sub-Metro', wards: [1, 2, 3, 4, 5, 6, 7] },
          { nameEn: 'Chhireshwarnath Municipality', nameNp: 'छिरेश्वरनाथ नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Ganeshman Charnath Municipality', nameNp: 'गणेशमान चर्नाथ नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
          { nameEn: 'Dhanushadham Municipality', nameNp: 'धनुषाधाम नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Nagarain Municipality', nameNp: 'नगरैन नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Videha Municipality', nameNp: 'विदेह नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
          { nameEn: 'Mithila Municipality', nameNp: 'मिथिला नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
          { nameEn: 'Sabaila Municipality', nameNp: 'साबैला नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Kamala Municipality', nameNp: 'कमला नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Mithila Bihari Municipality', nameNp: 'मिथिला बिहारी नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Hansapur Municipality', nameNp: 'हंसपुर नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Shahidnagar Municipality', nameNp: 'शहीदनगर नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Saptari',
        nameNp: 'सप्तरी',
        municipalities: [
          { nameEn: 'Rajbiraj Municipality', nameNp: 'राजबिराज नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Bode Barsain Municipality', nameNp: 'बोडे बर्सैन नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Dakneshwori Municipality', nameNp: 'दक्नेश्वरी नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Hanumannagar Kankalini Municipality', nameNp: 'हनुमाननगर कङ्कलिनी नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
          { nameEn: 'Kanchanrup Municipality', nameNp: 'कञ्चनरुप नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Khadak Municipality', nameNp: 'खडक नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Shambhunath Municipality', nameNp: 'शम्भुनाथ नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Surunga Municipality', nameNp: 'सुरुङ्गा नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Saptakoshi Municipality', nameNp: 'सप्तकोशी नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Siraha',
        nameNp: 'सिराहा',
        municipalities: [
          { nameEn: 'Lahan Municipality', nameNp: 'लहान नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Dhangadhimai Municipality', nameNp: 'ढङ्गढीमै नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Siraha Municipality', nameNp: 'सिराहा नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
          { nameEn: 'Golbazar Municipality', nameNp: 'गोलबजार नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Mirchaiya Municipality', nameNp: 'मिर्चैया नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Kalyanpur Municipality', nameNp: 'कल्याणपुर नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Karjanha Municipality', nameNp: 'करजन्हा नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Sukhipur Municipality', nameNp: 'सुखीपुर नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Mahottari',
        nameNp: 'महोत्तरी',
        municipalities: [
          { nameEn: 'Jaleshwar Municipality', nameNp: 'जलेश्वर नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Bardibas Municipality', nameNp: 'बर्दिबास नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
          { nameEn: 'Aurahi Municipality', nameNp: 'औराही नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Balawa Municipality', nameNp: 'बलवा नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Bhangaha Municipality', nameNp: 'भङ्गह नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Gaushala Municipality', nameNp: 'गौशाला नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Loharpatti Municipality', nameNp: 'लोहारपट्टी नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Manra Shiswa Municipality', nameNp: 'मन्र शिश्व नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Matihani Municipality', nameNp: 'मातिहानी नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Ramgopalpur Municipality', nameNp: 'रामगोपालपुर नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Sarlahi',
        nameNp: 'सर्लाही',
        municipalities: [
          { nameEn: 'Malangwa Municipality', nameNp: 'मलाङ्वा नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Bagmati Municipality', nameNp: 'बागमती नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Balara Municipality', nameNp: 'बलरा नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Barahathwa Municipality', nameNp: 'बराहथवा नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Godaita Municipality', nameNp: 'गोडैता नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Harion Municipality', nameNp: 'हरियोन नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Haripur Municipality', nameNp: 'हरिपुर नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Haripurwa Municipality', nameNp: 'हरिपुर्वा नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Ishworpur Municipality', nameNp: 'ईश्वरपुर नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Kabilasi Municipality', nameNp: 'कबिलासी नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Lalbandi Municipality', nameNp: 'लालबन्दी नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Rautahat',
        nameNp: 'रौतहट',
        municipalities: [
          { nameEn: 'Gaur Municipality', nameNp: 'गौर नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Baudhimai Municipality', nameNp: 'बौधिमै नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Brindaban Municipality', nameNp: 'ब्रिन्दावन नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Chandrapur Municipality', nameNp: 'चन्द्रपुर नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Dewahi Gonahi Municipality', nameNp: 'देवाही गोनाही नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Gadhimai Municipality', nameNp: 'गढीमै नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Garuda Municipality', nameNp: 'गरुड नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Gujara Municipality', nameNp: 'गुजरा नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Ishnath Municipality', nameNp: 'इश्नाथ नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Katahariya Municipality', nameNp: 'कटहरिया नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Madhav Narayan Municipality', nameNp: 'माधव नारायण नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Maulapur Municipality', nameNp: 'मौलापुर नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Paroha Municipality', nameNp: 'परोहा नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Phatuwa Bijayapur Municipality', nameNp: 'फटुवा विजयपुर नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Rajdevi Municipality', nameNp: 'राजदेवी नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Rajpur Municipality', nameNp: 'राजपुर नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
    ]
  },

  // ==================== 3. BAGMATI PROVINCE ====================
  {
    id: 3,
    nameEn: 'Bagmati Province',
    nameNp: 'बागमती प्रदेश',
    districts: [
      {
        nameEn: 'Kathmandu',
        nameNp: 'काठमाडौँ',
        municipalities: [
          {
            nameEn: 'Kathmandu Metropolitan City',
            nameNp: 'काठमाडौँ महानगरपालिका',
            type: 'Metro',
            wards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32],
            popularAreas: ['New Baneshwor', 'Putalisadak', 'Bagbazar', 'Maitighar', 'Thamel', 'Baluwatar', 'Kapan', 'Chabahil', 'Samakhusi', 'Kalanki']
          },
          {
            nameEn: 'Kirtipur Municipality',
            nameNp: 'कीर्तिपुर नगरपालिका',
            type: 'Municipality',
            wards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            popularAreas: ['TU Gate', 'Nayabazar Kirtipur', 'Chhobar', 'Panga', 'Baghbhairab']
          },
          {
            nameEn: 'Budhanilkantha Municipality',
            nameNp: 'बुढानीलकण्ठ नगरपालिका',
            type: 'Municipality',
            wards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            popularAreas: ['Golfutar', 'Hattigauda', 'Chunikhel', 'Mandikhatar']
          },
          {
            nameEn: 'Tokha Municipality',
            nameNp: 'टोखा नगरपालिका',
            type: 'Municipality',
            wards: [1, 2, 3, 4, 5, 6, 7, 8],
            popularAreas: ['Dhapasi', 'Basundhara', 'Grande Area', 'Tokha Road']
          },
          { nameEn: 'Chandragiri Municipality', nameNp: 'चन्द्रगिरी नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5, 6] },
          { nameEn: 'Dakshinkali Municipality', nameNp: 'दक्षिणकाली नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Gokarneshwar Municipality', nameNp: 'गोकर्णेश्वर नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Kageshwari Manohara Municipality', nameNp: 'कागेश्वरी मनोहरा नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5, 6] },
          { nameEn: 'Nagarjun Municipality', nameNp: 'नगरजुन नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5, 6] },
          { nameEn: 'Shankharapur Municipality', nameNp: 'शङ्खरपुर नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Tarakeshwar Municipality', nameNp: 'तारकेश्वर नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5, 6] },
        ]
      },
      {
        nameEn: 'Lalitpur',
        nameNp: 'ललितपुर',
        municipalities: [
          {
            nameEn: 'Lalitpur Metropolitan City',
            nameNp: 'ललितपुर महानगरपालिका',
            type: 'Metro',
            wards: [1, 2, 3, 4, 5, 9, 14, 15, 19, 20],
            popularAreas: ['Pulchowk', 'Patan Dhoka', 'Sanepa', 'Kupondole', 'Balkumari', 'Jawalakhel', 'Kumaripati', 'Lagankhel', 'Gwarko']
          },
          {
            nameEn: 'Mahalaxmi Municipality',
            nameNp: 'महालक्ष्मी नगरपालिका',
            type: 'Municipality',
            wards: [1, 2, 3, 4, 5],
            popularAreas: ['Imadol', 'Tikathali', 'Lubhu', 'Sanagaun']
          },
          { nameEn: 'Godawari Municipality', nameNp: 'गोदावरी नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
        ]
      },
      {
        nameEn: 'Bhaktapur',
        nameNp: 'भक्तपुर',
        municipalities: [
          {
            nameEn: 'Bhaktapur Municipality',
            nameNp: 'भक्तपुर नगरपालिका',
            type: 'Municipality',
            wards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            popularAreas: ['Dudhpati', 'Suryabinayak', 'Durbar Square area', 'Kamalbinayak']
          },
          {
            nameEn: 'Madhyapur Thimi Municipality',
            nameNp: 'मध्यपुर थिमी नगरपालिका',
            type: 'Municipality',
            wards: [1, 2, 3, 4, 5, 6],
            popularAreas: ['Sano Thimi', 'Lokanthali', 'Gatthaghar', 'Kaushaltar']
          },
          { nameEn: 'Suryabinayak Municipality', nameNp: 'सूर्यविनायक नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Changunarayan Municipality', nameNp: 'चाँगुनारायण नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
        ]
      },
      {
        nameEn: 'Chitwan',
        nameNp: 'चितवन',
        municipalities: [
          {
            nameEn: 'Bharatpur Metropolitan City',
            nameNp: 'भरतपुर महानगरपालिका',
            type: 'Metro',
            wards: [1, 2, 4, 7, 10, 11, 12],
            popularAreas: ['Chaubiskothi', 'CMC Medical College', 'Lions Chowk', 'Birendra Campus area', 'Narayangarh']
          },
          { nameEn: 'Ratnanagar Municipality', nameNp: 'रत्ननगर नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Khairahani Municipality', nameNp: 'खैरहनी नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
          { nameEn: 'Rapti Municipality', nameNp: 'राप्ती नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
          { nameEn: 'Kalika Municipality', nameNp: 'कालिका नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Madi Municipality', nameNp: 'माडी नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Kavrepalanchok',
        nameNp: 'काभ्रेपलाञ्चोक',
        municipalities: [
          { nameEn: 'Dhulikhel Municipality', nameNp: 'धुलिखेल नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Banepa Municipality', nameNp: 'बनेपा नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Panauti Municipality', nameNp: 'पनौती नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
          { nameEn: 'Panchkhal Municipality', nameNp: 'पाँचखाल नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
          { nameEn: 'Namobuddha Municipality', nameNp: 'नमोबुद्ध नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Mandandeupur Municipality', nameNp: 'मण्डनदेउपुर नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Makwanpur',
        nameNp: 'मकवानपुर',
        municipalities: [
          { nameEn: 'Hetauda Sub-Metropolitan City', nameNp: 'हेटौंडा उपमहानगरपालिका', type: 'Sub-Metro', wards: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
          { nameEn: 'Thaha Municipality', nameNp: 'थाहा नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
        ]
      },
      {
        nameEn: 'Nuwakot',
        nameNp: 'नुवाकोट',
        municipalities: [
          { nameEn: 'Bidur Municipality', nameNp: 'विदुर नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Belkotgadhi Municipality', nameNp: 'बेलकोटगढी नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
        ]
      },
      {
        nameEn: 'Dhading',
        nameNp: 'धादिङ',
        municipalities: [
          { nameEn: 'Nilkantha Municipality', nameNp: 'नीलकण्ठ नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Dhunibeshi Municipality', nameNp: 'धुनिबेशी नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
        ]
      },
      {
        nameEn: 'Sindhupalchok',
        nameNp: 'सिन्धुपाल्चोक',
        municipalities: [
          { nameEn: 'Chautara Sangachokgadhi Municipality', nameNp: 'चौतारा साँगाचोकगढी नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Barhabise Municipality', nameNp: 'बाह्रबिसे नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Melamchi Municipality', nameNp: 'मेलम्ची नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
        ]
      },
      {
        nameEn: 'Sindhuli',
        nameNp: 'सिन्धुली',
        municipalities: [
          { nameEn: 'Kamalamai Municipality', nameNp: 'कमलामाई नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Dudhouli Municipality', nameNp: 'दुधौली नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
        ]
      },
      {
        nameEn: 'Ramechhap',
        nameNp: 'रामेछाप',
        municipalities: [
          { nameEn: 'Manthali Municipality', nameNp: 'मन्थली नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Ramechhap Municipality', nameNp: 'रामेछाप नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
        ]
      },
      {
        nameEn: 'Dolakha',
        nameNp: 'दोलखा',
        municipalities: [
          { nameEn: 'Bhimeshwar Municipality', nameNp: 'भीमेश्वर नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Jiri Municipality', nameNp: 'जिरी नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Rasuwa',
        nameNp: 'रसुवा',
        municipalities: [
          { nameEn: 'Uttargaya Rural Municipality', nameNp: 'उत्तरगया गाउँपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
        ]
      },
    ]
  },

  // ==================== 4. GANDAKI PROVINCE ====================
  {
    id: 4,
    nameEn: 'Gandaki Province',
    nameNp: 'गण्डकी प्रदेश',
    districts: [
      {
        nameEn: 'Kaski',
        nameNp: 'कास्की',
        municipalities: [
          {
            nameEn: 'Pokhara Metropolitan City',
            nameNp: 'पोखरा महानगरपालिका',
            type: 'Metro',
            wards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
            popularAreas: ['Lakeside', 'Bagar (PN Campus)', 'Zero KM', 'Prithvi Chowk', 'Srijana Chowk', 'Lamachaur (WRC Engg)', 'Nadipur', 'Parsyang']
          }
        ]
      },
      {
        nameEn: 'Tanahun',
        nameNp: 'तनहुँ',
        municipalities: [
          { nameEn: 'Byas Municipality', nameNp: 'व्यास नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Shuklagandaki Municipality', nameNp: 'शुक्लागण्डकी नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
          { nameEn: 'Bhimad Municipality', nameNp: 'भिमाद नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Bhanu Municipality', nameNp: 'भानु नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
        ]
      },
      {
        nameEn: 'Syangja',
        nameNp: 'स्याङ्जा',
        municipalities: [
          { nameEn: 'Putalibazar Municipality', nameNp: 'पुतलीबजार नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Waling Municipality', nameNp: 'वालिङ नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
          { nameEn: 'Galyang Municipality', nameNp: 'गल्याङ नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Chapakot Municipality', nameNp: 'चापाकोट नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Bhirkot Municipality', nameNp: 'भीरकोट नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Nawalpur (Nawalparasi East)',
        nameNp: 'नवलपुर (नवलपरासी पूर्व)',
        municipalities: [
          { nameEn: 'Kawasoti Municipality', nameNp: 'कावासोती नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Gaindakot Municipality', nameNp: 'गैँडाकोट नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
          { nameEn: 'Devchuli Municipality', nameNp: 'देवचुली नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
          { nameEn: 'Madhyabindu Municipality', nameNp: 'मध्यविन्दु नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Gorkha',
        nameNp: 'गोरखा',
        municipalities: [
          { nameEn: 'Gorkha Municipality', nameNp: 'गोरखा नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Palungtar Municipality', nameNp: 'पालुङटार नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
        ]
      },
      {
        nameEn: 'Lamjung',
        nameNp: 'लमजुङ',
        municipalities: [
          { nameEn: 'Besisahar Municipality', nameNp: 'बेसीशहर नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Sundarbazar Municipality', nameNp: 'सुन्दरबजार नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Rainas Municipality', nameNp: 'रैनास नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Madhya Nepal Municipality', nameNp: 'मध्यनेपाल नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Baglung',
        nameNp: 'बागलुङ',
        municipalities: [
          { nameEn: 'Baglung Municipality', nameNp: 'बागलुङ नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Dhorpatan Municipality', nameNp: 'ढोरपाटन नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Galkot Municipality', nameNp: 'गलकोट नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Jaimini Municipality', nameNp: 'जैमिनी नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Parbat',
        nameNp: 'पर्वत',
        municipalities: [
          { nameEn: 'Kushma Municipality', nameNp: 'कुश्मा नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Phalebas Municipality', nameNp: 'फलेवास नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Myagdi',
        nameNp: 'म्याग्दी',
        municipalities: [
          { nameEn: 'Beni Municipality', nameNp: 'बेनी नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
        ]
      },
      {
        nameEn: 'Manang',
        nameNp: 'मनाङ',
        municipalities: [
          { nameEn: 'Chame Rural Municipality', nameNp: 'चामे गाउँपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
        ]
      },
      {
        nameEn: 'Mustang',
        nameNp: 'मुस्ताङ',
        municipalities: [
          { nameEn: 'Gharapjhong Rural Municipality', nameNp: 'घरपझोङ गाउँपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
        ]
      },
    ]
  },

  // ==================== 5. LUMBINI PROVINCE ====================
  {
    id: 5,
    nameEn: 'Lumbini Province',
    nameNp: 'लुम्बिनी प्रदेश',
    districts: [
      {
        nameEn: 'Rupandehi',
        nameNp: 'रुपन्देही',
        municipalities: [
          {
            nameEn: 'Butwal Sub-Metropolitan City',
            nameNp: 'बुटवल उपमहानगरपालिका',
            type: 'Sub-Metro',
            wards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
            popularAreas: ['Traffic Chowk', 'Golpark', 'Kalikanagar', 'Milanchowk', 'Deepnagar']
          },
          { nameEn: 'Siddharthanagar Municipality (Bhairahawa)', nameNp: 'सिद्धार्थनगर नगरपालिका (भैरहवा)', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Tilottama Municipality', nameNp: 'तिलोत्तमा नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Sainamaina Municipality', nameNp: 'सैनामैना नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
          { nameEn: 'Devdaha Municipality', nameNp: 'देवदह नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
          { nameEn: 'Lumbini Sanskritik Municipality', nameNp: 'लुम्बिनी सांस्कृतिक नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Dang',
        nameNp: 'दाङ',
        municipalities: [
          { nameEn: 'Ghorahi Sub-Metropolitan City', nameNp: 'घोराही उपमहानगरपालिका', type: 'Sub-Metro', wards: [1, 2, 3, 4, 5, 6, 7] },
          { nameEn: 'Tulsipur Sub-Metropolitan City', nameNp: 'तुलसीपुर उपमहानगरपालिका', type: 'Sub-Metro', wards: [1, 2, 3, 4, 5, 6] },
          { nameEn: 'Lamahi Municipality', nameNp: 'लमही नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
        ]
      },
      {
        nameEn: 'Banke',
        nameNp: 'बाँके',
        municipalities: [
          { nameEn: 'Nepalgunj Sub-Metropolitan City', nameNp: 'नेपालगञ्ज उपमहानगरपालिका', type: 'Sub-Metro', wards: [1, 2, 3, 4, 5, 6, 7, 8] },
          { nameEn: 'Kohalpur Municipality', nameNp: 'कोहलपुर नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
        ]
      },
      {
        nameEn: 'Bardiya',
        nameNp: 'बर्दिया',
        municipalities: [
          { nameEn: 'Gulariya Municipality', nameNp: 'गुलरिया नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Bansgadhi Municipality', nameNp: 'बाँसगढी नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Barbardiya Municipality', nameNp: 'बारबर्दिया नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Rajapur Municipality', nameNp: 'राजापुर नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Madhuwan Municipality', nameNp: 'मधुवन नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Thakurbaba Municipality', nameNp: 'ठाकुरबाबा नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Palpa',
        nameNp: 'पाल्पा',
        municipalities: [
          { nameEn: 'Tansen Municipality', nameNp: 'तानसेन नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Rampur Municipality', nameNp: 'रामपुर नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Kapilvastu',
        nameNp: 'कपिलवस्तु',
        municipalities: [
          { nameEn: 'Kapilvastu Municipality', nameNp: 'कपिलवस्तु नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Banganga Municipality', nameNp: 'बाणगङ्गा नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
          { nameEn: 'Buddhabhumi Municipality', nameNp: 'बुद्धभूमि नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Shivaraj Municipality', nameNp: 'शिवराज नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Krishnanagar Municipality', nameNp: 'कृष्णनगर नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Maharajgunj Municipality', nameNp: 'महाराजगञ्ज नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Parasi (Nawalparasi West)',
        nameNp: 'परासी (नवलपरासी पश्चिम)',
        municipalities: [
          { nameEn: 'Ramgram Municipality', nameNp: 'रामग्राम नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Bardaghat Municipality', nameNp: 'बर्दघाट नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
          { nameEn: 'Sunwal Municipality', nameNp: 'सुनवल नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Arghakhanchi',
        nameNp: 'अर्घाखाँची',
        municipalities: [
          { nameEn: 'Sandhikharka Municipality', nameNp: 'सन्धिखर्क नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Shitaganga Municipality', nameNp: 'शीतगङ्गा नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Bhumikasthan Municipality', nameNp: 'भूमिकास्थान नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Gulmi',
        nameNp: 'गुल्मी',
        municipalities: [
          { nameEn: 'Resunga Municipality', nameNp: 'रेसुङ्गा नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Musikot Municipality', nameNp: 'मुसिकोट नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Pyuthan',
        nameNp: 'प्युठान',
        municipalities: [
          { nameEn: 'Pyuthan Municipality', nameNp: 'प्युठान नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Swargadwari Municipality', nameNp: 'स्वर्गद्वारी नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Rolpa',
        nameNp: 'रोल्पा',
        municipalities: [
          { nameEn: 'Rolpa Municipality (Liwang)', nameNp: 'रोल्पा नगरपालिका (लिवाङ)', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
        ]
      },
      {
        nameEn: 'Eastern Rukum',
        nameNp: 'पूर्वी रुकुम',
        municipalities: [
          { nameEn: 'Rukumkot (Sisne)', nameNp: 'रुकुमकोट (सिस्ने)', type: 'Municipality', wards: [1, 2, 3, 4] },
        ]
      },
    ]
  },

  // ==================== 6. KARNALI PROVINCE ====================
  {
    id: 6,
    nameEn: 'Karnali Province',
    nameNp: 'कर्णाली प्रदेश',
    districts: [
      {
        nameEn: 'Surkhet',
        nameNp: 'सुर्खेत',
        municipalities: [
          { nameEn: 'Birendranagar Municipality', nameNp: 'वीरेन्द्रनगर नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
          { nameEn: 'Bheriganga Municipality', nameNp: 'भेरीगंगा नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
          { nameEn: 'Gurbhakot Municipality', nameNp: 'गुर्भाकोट नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Panchapuri Municipality', nameNp: 'पञ्चपुरी नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Lekbeshi Municipality', nameNp: 'लेकवेशी नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Dailekh',
        nameNp: 'दैलेख',
        municipalities: [
          { nameEn: 'Narayan Municipality', nameNp: 'नारायण नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Dullu Municipality', nameNp: 'दुल्लु नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Chamunda Bindrasaini Municipality', nameNp: 'चामुण्डा विन्द्रासैनी नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Aathbis Municipality', nameNp: 'आठबीस नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Jumla',
        nameNp: 'जुम्ला',
        municipalities: [
          { nameEn: 'Chandannath Municipality', nameNp: 'चन्दननाथ नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
        ]
      },
      {
        nameEn: 'Jajarkot',
        nameNp: 'जाजरकोट',
        municipalities: [
          { nameEn: 'Bheri Municipality', nameNp: 'भेरी नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Chhedagad Municipality', nameNp: 'छेडेगाड नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Nalgad Municipality', nameNp: 'नलगाड नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Salyan',
        nameNp: 'सल्यान',
        municipalities: [
          { nameEn: 'Sharada Municipality', nameNp: 'शारदा नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Bagchaur Municipality', nameNp: 'बागचौर नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Bangad Kupinde Municipality', nameNp: 'बनगाड कुपिण्डे नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Western Rukum',
        nameNp: 'पश्चिम रुकुम',
        municipalities: [
          { nameEn: 'Musikot Municipality', nameNp: 'मुसिकोट नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Chaurjahari Municipality', nameNp: 'चौरजहारी नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Aathbiskot Municipality', nameNp: 'आठबीसकोट नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Kalikot',
        nameNp: 'कालिकोट',
        municipalities: [
          { nameEn: 'Khandachakra Municipality', nameNp: 'खाँडाचक्र नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Raskot Municipality', nameNp: 'रास्कोट नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Tilagufa Municipality', nameNp: 'तिलागुफा नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Mugu',
        nameNp: 'मुगु',
        municipalities: [
          { nameEn: 'Chhayanath Rara Municipality', nameNp: 'छायानाथ रारा नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
        ]
      },
      {
        nameEn: 'Humla',
        nameNp: 'हुम्ला',
        municipalities: [
          { nameEn: 'Simikot Rural Municipality', nameNp: 'सिमिकोट गाउँपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
        ]
      },
      {
        nameEn: 'Dolpa',
        nameNp: 'डोल्पा',
        municipalities: [
          { nameEn: 'Thuli Bheri Municipality', nameNp: 'ठूली भेरी नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Tripurasundari Municipality', nameNp: 'त्रिपुरासुन्दरी नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
    ]
  },

  // ==================== 7. SUDURPASCHIM PROVINCE ====================
  {
    id: 7,
    nameEn: 'Sudurpashchim Province',
    nameNp: 'सुदूरपश्चिम प्रदेश',
    districts: [
      {
        nameEn: 'Kailali',
        nameNp: 'कैलाली',
        municipalities: [
          { nameEn: 'Dhangadhi Sub-Metropolitan City', nameNp: 'धनगढी उपमहानगरपालिका', type: 'Sub-Metro', wards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
          { nameEn: 'Tikapur Municipality', nameNp: 'टीकापुर नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Godawari Municipality', nameNp: 'गोदावरी नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
          { nameEn: 'Lamkichuha Municipality', nameNp: 'लम्कीचुहा नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
          { nameEn: 'Ghodaghodi Municipality', nameNp: 'घोडाघोडी नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Bhajani Municipality', nameNp: 'भजनी नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Gauriganga Municipality', nameNp: 'गौरीगङ्गा नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Kanchanpur',
        nameNp: 'कञ्चनपुर',
        municipalities: [
          { nameEn: 'Bhimdatta Municipality (Mahendranagar)', nameNp: 'भीमदत्त नगरपालिका (महेन्द्रनगर)', type: 'Municipality', wards: [1, 2, 3, 4, 5, 6, 7] },
          { nameEn: 'Bedkot Municipality', nameNp: 'वेदकोट नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4] },
          { nameEn: 'Shuklaphanta Municipality', nameNp: 'शुक्लाफाँटा नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Mahakali Municipality (Dodhala Chandani)', nameNp: 'दोधारा चाँदनी नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Krishnapur Municipality', nameNp: 'कृष्णपुर नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Punarbas Municipality', nameNp: 'पुनर्वास नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Belauri Municipality', nameNp: 'बेलौरी नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Dadeldhura',
        nameNp: 'डडेल्धुरा',
        municipalities: [
          { nameEn: 'Amargadhi Municipality', nameNp: 'अमरगढी नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Parshuram Municipality', nameNp: 'परशुराम नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Doti',
        nameNp: 'डोटी',
        municipalities: [
          { nameEn: 'Dipayal Silgadhi Municipality', nameNp: 'दिपायल सिलगढी नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Shikhar Municipality', nameNp: 'शिखर नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Achham',
        nameNp: 'अछाम',
        municipalities: [
          { nameEn: 'Mangalsen Municipality', nameNp: 'मङ्गलसेन नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Sanphebagar Municipality', nameNp: 'साँफेबगर नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Kamalbazar Municipality', nameNp: 'कमलबजार नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Panchadewal Binayak Municipality', nameNp: 'पञ्चदेवल विनायक नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Baitadi',
        nameNp: 'बैतडी',
        municipalities: [
          { nameEn: 'Dasharathchand Municipality', nameNp: 'दशरथचन्द नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Patan Municipality', nameNp: 'पाटन नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Melauli Municipality', nameNp: 'मेलौली नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Purchaudi Municipality', nameNp: 'पुर्चौडी नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Darchula',
        nameNp: 'दार्चुला',
        municipalities: [
          { nameEn: 'Mahakali Municipality', nameNp: 'महाकाली नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Shailyashikhar Municipality', nameNp: 'शैल्यशिखर नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Bajhang',
        nameNp: 'बझाङ',
        municipalities: [
          { nameEn: 'Jayaprithvi Municipality (Chainpur)', nameNp: 'जयपृथ्वी नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Bungagal Municipality', nameNp: 'बुङ्गल नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
      {
        nameEn: 'Bajura',
        nameNp: 'बाजुरा',
        municipalities: [
          { nameEn: 'Badimalika Municipality', nameNp: 'बडीमालिका नगरपालिका', type: 'Municipality', wards: [1, 2, 3, 4, 5] },
          { nameEn: 'Tribeni Municipality', nameNp: 'त्रिवेणी नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Budhiganga Municipality', nameNp: 'बुढीगङ्गा नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
          { nameEn: 'Budhinanda Municipality', nameNp: 'बुढीनन्दा नगरपालिका', type: 'Municipality', wards: [1, 2, 3] },
        ]
      },
    ]
  }
];

export const NEPAL_CAMPUSES: CampusMarker[] = [
  {
    nameEn: 'Tribhuvan University (Central Campus)',
    nameNp: 'त्रिभुवन विश्वविद्यालय (केन्द्रीय क्याम्पस)',
    city: 'Kirtipur, Kathmandu',
    district: 'Kathmandu',
    lat: 27.6792,
    lng: 85.2894,
    studentsCount: '35,000+ Students',
    type: 'University'
  },
  {
    nameEn: 'Pulchowk Campus (IOE)',
    nameNp: 'पुल्चोक इन्जिनियरिङ क्याम्पस',
    city: 'Pulchowk, Lalitpur',
    district: 'Lalitpur',
    lat: 27.6798,
    lng: 85.3175,
    studentsCount: '4,000+ Engineers',
    type: 'College'
  },
  {
    nameEn: 'Shankar Dev Campus',
    nameNp: 'शंकरदेव क्याम्पस',
    city: 'Putalisadak, Kathmandu',
    district: 'Kathmandu',
    lat: 27.7056,
    lng: 85.3218,
    studentsCount: '9,000+ Management',
    type: 'College'
  },
  {
    nameEn: 'Apex College / Baneshwor Colleges',
    nameNp: 'एपेक्स कलेज / नयाँ बानेश्वर',
    city: 'New Baneshwor, Kathmandu',
    district: 'Kathmandu',
    lat: 27.6915,
    lng: 85.3420,
    studentsCount: '12,000+ Students',
    type: 'College'
  },
  {
    nameEn: 'Prithvi Narayan Campus (PNC)',
    nameNp: 'पृथ्वीनारायण क्याम्पस',
    city: 'Bagar, Pokhara',
    district: 'Kaski',
    lat: 28.2435,
    lng: 83.9856,
    studentsCount: '15,000+ Students',
    type: 'College'
  },
  {
    nameEn: 'Chitwan Medical College (CMC)',
    nameNp: 'चितवन मेडिकल कलेज',
    city: 'Bharatpur, Chitwan',
    district: 'Chitwan',
    lat: 27.6833,
    lng: 84.4333,
    studentsCount: '3,000+ Medical Students',
    type: 'College'
  },
  {
    nameEn: 'BP Koirala Institute of Health Sciences (BPKIHS)',
    nameNp: 'बी.पी. कोइराला स्वास्थ्य विज्ञान प्रतिष्ठान',
    city: 'Dharan, Sunsari',
    district: 'Sunsari',
    lat: 26.8123,
    lng: 87.2834,
    studentsCount: '2,500+ Medical Students',
    type: 'Institute'
  },
  {
    nameEn: 'Kathmandu University (KU)',
    nameNp: 'काठमाडौँ विश्वविद्यालय',
    city: 'Dhulikhel, Kavrepalanchok',
    district: 'Kavrepalanchok',
    lat: 27.6186,
    lng: 85.5385,
    studentsCount: '18,000+ Students',
    type: 'University'
  },
  {
    nameEn: 'Purbanchal University (PU)',
    nameNp: 'पूर्वाञ्चल विश्वविद्यालय',
    city: 'Biratnagar / Gothgaun, Morang',
    district: 'Morang',
    lat: 26.4525,
    lng: 87.2718,
    studentsCount: '20,000+ Students',
    type: 'University'
  },
  {
    nameEn: 'Mid-Western University (MWU)',
    nameNp: 'मध्यपश्चिम विश्वविद्यालय',
    city: 'Birendranagar, Surkhet',
    district: 'Surkhet',
    lat: 28.5983,
    lng: 81.6338,
    studentsCount: '8,000+ Students',
    type: 'University'
  },
  {
    nameEn: 'Far-Western University (FWU)',
    nameNp: 'सुदूरपश्चिम विश्वविद्यालय',
    city: 'Mahendranagar, Kanchanpur',
    district: 'Kanchanpur',
    lat: 28.9634,
    lng: 80.1804,
    studentsCount: '6,500+ Students',
    type: 'University'
  }
];
