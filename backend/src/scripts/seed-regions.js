// 파일 전체를 다음과 같이 수정
const { Province, City } = require('../models');
const sequelize = require('../config/database');

// 시도 데이터
const provinceData = [
    { name: '서울특별시', code: 'SEOUL' },
    { name: '부산광역시', code: 'BUSAN' },
    { name: '대구광역시', code: 'DAEGU' },
    { name: '인천광역시', code: 'INCHEON' },
    { name: '광주광역시', code: 'GWANGJU' },
    { name: '대전광역시', code: 'DAEJEON' },
    { name: '울산광역시', code: 'ULSAN' },
    { name: '세종특별자치시', code: 'SEJONG' },
    { name: '경기도', code: 'GYEONGGI' },
    { name: '강원도', code: 'GANGWON' },
    { name: '충청북도', code: 'CHUNGBUK' },
    { name: '충청남도', code: 'CHUNGNAM' },
    { name: '전라북도', code: 'JEONBUK' },
    { name: '전라남도', code: 'JEONNAM' },
    { name: '경상북도', code: 'GYEONGBUK' },
    { name: '경상남도', code: 'GYEONGNAM' },
    { name: '제주특별자치도', code: 'JEJU' }
];

// 시군구 데이터 (전국)
const cityData = {
    'SEOUL': ['강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'],
    
    'BUSAN': ['강서구', '금정구', '남구', '동구', '동래구', '부산진구', '북구', '사상구', '사하구', '서구', '수영구', '연제구', '영도구', '중구', '해운대구', '기장군'],
    
    'DAEGU': ['남구', '달서구', '동구', '북구', '서구', '수성구', '중구', '달성군'],
    
    'INCHEON': ['계양구', '남동구', '동구', '미추홀구', '부평구', '서구', '연수구', '중구', '강화군', '옹진군'],
    
    'GWANGJU': ['광산구', '남구', '동구', '북구', '서구'],
    
    'DAEJEON': ['대덕구', '동구', '서구', '유성구', '중구'],
    
    'ULSAN': ['남구', '동구', '북구', '중구', '울주군'],
    
    'SEJONG': ['세종시'],
    
    'GYEONGGI': ['고양시', '과천시', '광명시', '광주시', '구리시', '군포시', '김포시', '남양주시', '동두천시', '부천시', '성남시', '수원시', '시흥시', '안산시', '안성시', '안양시', '양주시', '여주시', '오산시', '용인시', '의왕시', '의정부시', '이천시', '파주시', '평택시', '포천시', '하남시', '화성시', '가평군', '양평군', '연천군'],
    
    'GANGWON': ['강릉시', '동해시', '삼척시', '속초시', '원주시', '춘천시', '태백시', '고성군', '양구군', '양양군', '영월군', '인제군', '정선군', '철원군', '평창군', '홍천군', '화천군', '횡성군'],
    
    'CHUNGBUK': ['제천시', '청주시', '충주시', '괴산군', '단양군', '보은군', '영동군', '옥천군', '음성군', '증평군', '진천군'],
    
    'CHUNGNAM': ['계룡시', '공주시', '논산시', '당진시', '보령시', '서산시', '아산시', '천안시', '금산군', '부여군', '서천군', '예산군', '청양군', '태안군', '홍성군'],
    
    'JEONBUK': ['군산시', '김제시', '남원시', '익산시', '전주시', '정읍시', '고창군', '무주군', '부안군', '순창군', '완주군', '임실군', '장수군', '진안군'],
    
    'JEONNAM': ['광양시', '나주시', '목포시', '순천시', '여수시', '강진군', '고흥군', '곡성군', '구례군', '담양군', '무안군', '보성군', '신안군', '영광군', '영암군', '완도군', '장성군', '장흥군', '진도군', '함평군', '해남군', '화순군'],
    
    'GYEONGBUK': ['경산시', '경주시', '구미시', '김천시', '문경시', '상주시', '안동시', '영주시', '영천시', '포항시', '고령군', '군위군', '봉화군', '성주군', '영덕군', '영양군', '예천군', '울릉군', '울진군', '의성군', '청도군', '청송군', '칠곡군'],
    
    'GYEONGNAM': ['거제시', '김해시', '밀양시', '사천시', '양산시', '진주시', '창원시', '통영시', '거창군', '고성군', '남해군', '산청군', '의령군', '창녕군', '하동군', '함안군', '함양군', '합천군'],
    
    'JEJU': ['제주시', '서귀포시']
};

async function seedRegions() {
    try {
        await sequelize.authenticate();
        console.log('데이터베이스 연결 성공');

        await sequelize.transaction(async (t) => {
            await City.destroy({ where: {}, transaction: t, force: true });
            await Province.destroy({ where: {}, transaction: t, force: true });

            const provinces = await Province.bulkCreate(
                provinceData.map(p => ({
                    ...p,
                    created_at: new Date(),
                    updated_at: new Date()
                })),
                { transaction: t }
            );

            for (const province of provinces) {
                const cities = cityData[province.code] || [];
                if (cities.length > 0) {
                    await City.bulkCreate(
                        cities.map((cityName, index) => ({
                            province_id: province.id,
                            name: cityName,
                            code: `P${province.id}_C${index + 1}`,
                            created_at: new Date(),
                            updated_at: new Date()
                        })),
                        { transaction: t }
                    );
                }
            }
        });

        console.log('지역 데이터 삽입 완료');
    } catch (error) {
        console.error('지역 데이터 삽입 실패: ', error);
    } finally {
        process.exit(0);
    }
}

seedRegions();