import { PrismaClient, BusStatus, CorporationType, ServiceType, StopCategory } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

const TAMIL_NADU_DISTRICTS = [
  // North (11 districts)
  { name: 'Chennai', region: 'North' },
  { name: 'Chengalpattu', region: 'North' },
  { name: 'Kanchipuram', region: 'North' },
  { name: 'Tiruvallur', region: 'North' },
  { name: 'Ranipet', region: 'North' },
  { name: 'Vellore', region: 'North' },
  { name: 'Tirupathur', region: 'North' },
  { name: 'Tiruvannamalai', region: 'North' },
  { name: 'Villupuram', region: 'North' },
  { name: 'Kallakurichi', region: 'North' },
  { name: 'Cuddalore', region: 'North' },
  // Central (5 districts)
  { name: 'Tiruchirappalli', region: 'Central' },
  { name: 'Karur', region: 'Central' },
  { name: 'Perambalur', region: 'Central' },
  { name: 'Ariyalur', region: 'Central' },
  { name: 'Pudukkottai', region: 'Central' },
  // Delta (4 districts)
  { name: 'Thanjavur', region: 'Delta' },
  { name: 'Tiruvarur', region: 'Delta' },
  { name: 'Nagapattinam', region: 'Delta' },
  { name: 'Mayiladuthurai', region: 'Delta' },
  // West (8 districts)
  { name: 'Salem', region: 'West' },
  { name: 'Namakkal', region: 'West' },
  { name: 'Dharmapuri', region: 'West' },
  { name: 'Krishnagiri', region: 'West' },
  { name: 'Erode', region: 'West' },
  { name: 'Coimbatore', region: 'West' },
  { name: 'Tiruppur', region: 'West' },
  { name: 'The Nilgiris', region: 'West' },
  // South (10 districts)
  { name: 'Madurai', region: 'South' },
  { name: 'Dindigul', region: 'South' },
  { name: 'Theni', region: 'South' },
  { name: 'Virudhunagar', region: 'South' },
  { name: 'Sivaganga', region: 'South' },
  { name: 'Ramanathapuram', region: 'South' },
  { name: 'Thoothukudi', region: 'South' },
  { name: 'Tirunelveli', region: 'South' },
  { name: 'Tenkasi', region: 'South' },
  { name: 'Kanyakumari', region: 'South' },
];

const TN_STOPS_CATALOG = [
  // Ariyalur
  { name: 'Ariyalur New Bus Stand', latitude: 11.1402, longitude: 79.0786, category: StopCategory.CITY_HUB, districtName: 'Ariyalur' },
  { name: 'Jayankondam Bus Stand', latitude: 11.2134, longitude: 79.3491, category: StopCategory.TOWN_STOP, districtName: 'Ariyalur' },
  { name: 'Sendurai Village Stop', latitude: 11.2505, longitude: 79.1852, category: StopCategory.VILLAGE_STOP, districtName: 'Ariyalur' },
  { name: 'Thirumanur Village Stop', latitude: 10.9786, longitude: 79.0984, category: StopCategory.VILLAGE_STOP, districtName: 'Ariyalur' },
  
  // Chengalpattu
  { name: 'Chengalpattu Junction Stand', latitude: 12.6841, longitude: 79.9836, category: StopCategory.CITY_HUB, districtName: 'Chengalpattu' },
  { name: 'Thiruporur Bus Stand', latitude: 12.7265, longitude: 80.1912, category: StopCategory.TOWN_STOP, districtName: 'Chengalpattu' },
  { name: 'Sadras Village Stop', latitude: 12.5192, longitude: 80.1584, category: StopCategory.VILLAGE_STOP, districtName: 'Chengalpattu' },
  { name: 'Mamallapuram Bypass', latitude: 12.6256, longitude: 80.1901, category: StopCategory.TOWN_STOP, districtName: 'Chengalpattu' },
  { name: 'Perungalathur', latitude: 12.9056, longitude: 80.0912, category: StopCategory.TOWN_STOP, districtName: 'Chengalpattu' },
  { name: 'Vandalur Zoo', latitude: 12.8791, longitude: 80.0812, category: StopCategory.TOWN_STOP, districtName: 'Chengalpattu' },
  { name: 'Guduvancheri', latitude: 12.8412, longitude: 80.0612, category: StopCategory.TOWN_STOP, districtName: 'Chengalpattu' },
  { name: 'Singaperumal Koil', latitude: 12.7691, longitude: 79.9812, category: StopCategory.VILLAGE_STOP, districtName: 'Chengalpattu' },
  { name: 'Mahindra World City', latitude: 12.7291, longitude: 79.9912, category: StopCategory.TOWN_STOP, districtName: 'Chengalpattu' },

  // Chennai
  { name: 'Chennai Koyambedu Hub', latitude: 13.0674, longitude: 80.2058, category: StopCategory.CITY_HUB, districtName: 'Chennai' },
  { name: 'Broadway Terminus', latitude: 13.0894, longitude: 80.2818, category: StopCategory.CITY_HUB, districtName: 'Chennai' },
  { name: 'T. Nagar Terminus', latitude: 13.0415, longitude: 80.2348, category: StopCategory.CITY_HUB, districtName: 'Chennai' },
  { name: 'Guindy Hub', latitude: 13.0064, longitude: 80.2209, category: StopCategory.CITY_HUB, districtName: 'Chennai' },
  { name: 'Tambaram', latitude: 12.9249, longitude: 80.1239, category: StopCategory.CITY_HUB, districtName: 'Chennai' },
  { name: 'Chromepet', latitude: 12.9516, longitude: 80.1430, category: StopCategory.TOWN_STOP, districtName: 'Chennai' },
  { name: 'Pallavaram', latitude: 12.9698, longitude: 80.1508, category: StopCategory.TOWN_STOP, districtName: 'Chennai' },
  { name: 'Meenambakkam', latitude: 12.9941, longitude: 80.1770, category: StopCategory.TOWN_STOP, districtName: 'Chennai' },
  { name: 'Saidapet', latitude: 13.0312, longitude: 80.2320, category: StopCategory.TOWN_STOP, districtName: 'Chennai' },
  { name: 'Egmore', latitude: 13.0733, longitude: 80.2594, category: StopCategory.CITY_HUB, districtName: 'Chennai' },
  { name: 'Broadway', latitude: 13.0827, longitude: 80.2708, category: StopCategory.CITY_HUB, districtName: 'Chennai' },
  { name: 'MMDA Colony', latitude: 13.0712, longitude: 80.2184, category: StopCategory.TOWN_STOP, districtName: 'Chennai' },
  { name: 'Jaffarkhanpet', latitude: 13.0291, longitude: 80.2091, category: StopCategory.TOWN_STOP, districtName: 'Chennai' },
  { name: 'Velachery', latitude: 12.9812, longitude: 80.2201, category: StopCategory.CITY_HUB, districtName: 'Chennai' },
  { name: 'SRP Tools', latitude: 12.9802, longitude: 80.2452, category: StopCategory.TOWN_STOP, districtName: 'Chennai' },
  { name: 'Thoraipakkam', latitude: 12.9691, longitude: 80.2458, category: StopCategory.TOWN_STOP, districtName: 'Chennai' },
  { name: 'Sholinganallur', latitude: 12.9012, longitude: 80.2272, category: StopCategory.CITY_HUB, districtName: 'Chennai' },
  { name: 'Siruseri IT Park', latitude: 12.8394, longitude: 80.2201, category: StopCategory.TOWN_STOP, districtName: 'Chennai' },
  { name: 'Kelambakkam', latitude: 12.7841, longitude: 80.2212, category: StopCategory.CITY_HUB, districtName: 'Chennai' },
  { name: 'Mylapore', latitude: 13.0331, longitude: 80.2682, category: StopCategory.TOWN_STOP, districtName: 'Chennai' },
  { name: 'Adyar Mandaveli', latitude: 13.0241, longitude: 80.2501, category: StopCategory.TOWN_STOP, districtName: 'Chennai' },
  { name: 'Kandanchavadi', latitude: 12.9691, longitude: 80.2482, category: StopCategory.TOWN_STOP, districtName: 'Chennai' },
  { name: 'Karapakkam', latitude: 12.9291, longitude: 80.2291, category: StopCategory.TOWN_STOP, districtName: 'Chennai' },
  { name: 'Semmancheri', latitude: 12.8712, longitude: 80.2251, category: StopCategory.TOWN_STOP, districtName: 'Chennai' },
  { name: 'Navalur', latitude: 12.8491, longitude: 80.2241, category: StopCategory.TOWN_STOP, districtName: 'Chennai' },
  { name: 'Central Railway Station', latitude: 13.0827, longitude: 80.2754, category: StopCategory.CITY_HUB, districtName: 'Chennai' },
  { name: 'Triplicane', latitude: 13.0591, longitude: 80.2741, category: StopCategory.TOWN_STOP, districtName: 'Chennai' },
  { name: 'Santhome', latitude: 13.0301, longitude: 80.2782, category: StopCategory.TOWN_STOP, districtName: 'Chennai' },
  { name: 'Thiruvanmiyur', latitude: 12.9894, longitude: 80.2582, category: StopCategory.CITY_HUB, districtName: 'Chennai' },
  { name: 'LIC', latitude: 13.0641, longitude: 80.2682, category: StopCategory.TOWN_STOP, districtName: 'Chennai' },
  { name: 'Mount Road', latitude: 13.0612, longitude: 80.2641, category: StopCategory.TOWN_STOP, districtName: 'Chennai' },
  { name: 'Teynampet', latitude: 13.0412, longitude: 80.2502, category: StopCategory.TOWN_STOP, districtName: 'Chennai' },
  { name: 'Nandanam', latitude: 13.0302, longitude: 80.2442, category: StopCategory.TOWN_STOP, districtName: 'Chennai' },

  // Coimbatore
  { name: 'Coimbatore Gandhipuram Stand', latitude: 11.0183, longitude: 76.9644, category: StopCategory.CITY_HUB, districtName: 'Coimbatore' },
  { name: 'Singanallur Bus Stand', latitude: 11.0028, longitude: 77.0253, category: StopCategory.CITY_HUB, districtName: 'Coimbatore' },
  { name: 'Mettupalayam Bus Stand', latitude: 11.3001, longitude: 76.9407, category: StopCategory.CITY_HUB, districtName: 'Coimbatore' },
  { name: 'Pollachi Bus Stand', latitude: 10.6582, longitude: 77.0092, category: StopCategory.CITY_HUB, districtName: 'Coimbatore' },
  { name: 'Kinathukadavu Town Stop', latitude: 10.8202, longitude: 77.0182, category: StopCategory.TOWN_STOP, districtName: 'Coimbatore' },
  { name: 'Othakkalmandapam Village Stop', latitude: 10.8951, longitude: 76.9951, category: StopCategory.VILLAGE_STOP, districtName: 'Coimbatore' },
  { name: 'Palladam Bus Stand', latitude: 10.9892, longitude: 77.2794, category: StopCategory.TOWN_STOP, districtName: 'Coimbatore' },

  // Cuddalore
  { name: 'Cuddalore Bus Stand', latitude: 11.7483, longitude: 79.7714, category: StopCategory.CITY_HUB, districtName: 'Cuddalore' },
  { name: 'Chidambaram Bus Stand', latitude: 11.3992, longitude: 79.6936, category: StopCategory.CITY_HUB, districtName: 'Cuddalore' },
  { name: 'Panruti Bus Stand', latitude: 11.7709, longitude: 79.5534, category: StopCategory.TOWN_STOP, districtName: 'Cuddalore' },
  { name: 'Nellikuppam Town Stop', latitude: 11.7702, longitude: 79.6804, category: StopCategory.TOWN_STOP, districtName: 'Cuddalore' },
  { name: 'Kurinjipadi Village Stop', latitude: 11.5684, longitude: 79.6052, category: StopCategory.VILLAGE_STOP, districtName: 'Cuddalore' },

  // Dharmapuri
  { name: 'Dharmapuri Hub', latitude: 12.1211, longitude: 78.1582, category: StopCategory.CITY_HUB, districtName: 'Dharmapuri' },
  { name: 'Harur Bus Stand', latitude: 12.0628, longitude: 78.4984, category: StopCategory.TOWN_STOP, districtName: 'Dharmapuri' },
  { name: 'Palacode Town Stop', latitude: 12.3012, longitude: 78.0792, category: StopCategory.TOWN_STOP, districtName: 'Dharmapuri' },
  { name: 'Toppur Tollgate', latitude: 11.9682, longitude: 78.0521, category: StopCategory.VILLAGE_STOP, districtName: 'Dharmapuri' },
  { name: 'Pennagaram Village Stop', latitude: 12.1384, longitude: 77.9015, category: StopCategory.VILLAGE_STOP, districtName: 'Dharmapuri' },

  // Dindigul
  { name: 'Dindigul Bus Stand', latitude: 10.3673, longitude: 77.9803, category: StopCategory.CITY_HUB, districtName: 'Dindigul' },
  { name: 'Palani Bus Stand', latitude: 10.4491, longitude: 77.5192, category: StopCategory.CITY_HUB, districtName: 'Dindigul' },
  { name: 'Kodaikanal Bus Stand', latitude: 10.2312, longitude: 77.4901, category: StopCategory.CITY_HUB, districtName: 'Dindigul' },
  { name: 'Natham Town Stop', latitude: 10.2715, longitude: 78.2321, category: StopCategory.TOWN_STOP, districtName: 'Dindigul' },
  { name: 'Vadamadurai Village Stop', latitude: 10.4721, longitude: 78.0812, category: StopCategory.VILLAGE_STOP, districtName: 'Dindigul' },

  // Erode
  { name: 'Erode Central Stand', latitude: 11.3410, longitude: 77.7172, category: StopCategory.CITY_HUB, districtName: 'Erode' },
  { name: 'Gobichettipalayam Bus Stand', latitude: 11.4530, longitude: 77.4384, category: StopCategory.CITY_HUB, districtName: 'Erode' },
  { name: 'Bhavani Bus Stand', latitude: 11.4421, longitude: 77.6802, category: StopCategory.CITY_HUB, districtName: 'Erode' },
  { name: 'Kodumudi Village Stop', latitude: 11.0801, longitude: 77.8802, category: StopCategory.VILLAGE_STOP, districtName: 'Erode' },
  { name: 'Perundurai Bypass', latitude: 11.2741, longitude: 77.5852, category: StopCategory.TOWN_STOP, districtName: 'Erode' },

  // Kallakurichi
  { name: 'Kallakurichi Bus Stand', latitude: 11.7382, longitude: 78.9612, category: StopCategory.CITY_HUB, districtName: 'Kallakurichi' },
  { name: 'Ulundurpet Bus Stand', latitude: 11.6852, longitude: 79.2891, category: StopCategory.CITY_HUB, districtName: 'Kallakurichi' },
  { name: 'Sankarapuram Town Stop', latitude: 11.8841, longitude: 78.9102, category: StopCategory.TOWN_STOP, districtName: 'Kallakurichi' },
  { name: 'Chinnasalem Village Stop', latitude: 11.7215, longitude: 78.8023, category: StopCategory.VILLAGE_STOP, districtName: 'Kallakurichi' },
  { name: 'Thirukkoilur Bypass', latitude: 11.9561, longitude: 79.2012, category: StopCategory.TOWN_STOP, districtName: 'Kallakurichi' },

  // Kanchipuram
  { name: 'Kanchipuram Bus Stand', latitude: 12.8342, longitude: 79.7036, category: StopCategory.CITY_HUB, districtName: 'Kanchipuram' },
  { name: 'Sriperumbudur Bus Stand', latitude: 12.9691, longitude: 79.9491, category: StopCategory.CITY_HUB, districtName: 'Kanchipuram' },
  { name: 'Walajabad Town Stop', latitude: 12.8012, longitude: 79.8192, category: StopCategory.TOWN_STOP, districtName: 'Kanchipuram' },
  { name: 'Uthiramerur Village Stop', latitude: 12.6152, longitude: 79.7051, category: StopCategory.VILLAGE_STOP, districtName: 'Kanchipuram' },
  { name: 'Kundrathur Bypass', latitude: 12.9991, longitude: 80.0612, category: StopCategory.TOWN_STOP, districtName: 'Kanchipuram' },

  // Kanyakumari
  { name: 'Nagercoil Christopher Stand', latitude: 8.1816, longitude: 77.4124, category: StopCategory.CITY_HUB, districtName: 'Kanyakumari' },
  { name: 'Kanyakumari Beach Road', latitude: 8.0792, longitude: 77.5542, category: StopCategory.CITY_HUB, districtName: 'Kanyakumari' },
  { name: 'Thuckalay Bus Stand', latitude: 8.2492, longitude: 77.3245, category: StopCategory.CITY_HUB, districtName: 'Kanyakumari' },
  { name: 'Marthandam Town Stop', latitude: 8.3012, longitude: 77.2182, category: StopCategory.TOWN_STOP, districtName: 'Kanyakumari' },
  { name: 'Kalkulam Village Stop', latitude: 8.2251, longitude: 77.3402, category: StopCategory.VILLAGE_STOP, districtName: 'Kanyakumari' },

  // Karur
  { name: 'Karur Bus Stand', latitude: 10.9601, longitude: 78.0762, category: StopCategory.CITY_HUB, districtName: 'Karur' },
  { name: 'Kulithalai Bus Stand', latitude: 10.9324, longitude: 78.4121, category: StopCategory.CITY_HUB, districtName: 'Karur' },
  { name: 'Aravakurichi Town Stop', latitude: 10.7712, longitude: 77.9102, category: StopCategory.TOWN_STOP, districtName: 'Karur' },
  { name: 'Velayuthampalayam Stop', latitude: 11.0791, longitude: 78.0102, category: StopCategory.TOWN_STOP, districtName: 'Karur' },
  { name: 'Krishnarayapuram Village Stop', latitude: 10.9412, longitude: 78.2812, category: StopCategory.VILLAGE_STOP, districtName: 'Karur' },

  // Krishnagiri
  { name: 'Krishnagiri Bypass', latitude: 12.5271, longitude: 78.2132, category: StopCategory.CITY_HUB, districtName: 'Krishnagiri' },
  { name: 'Hosur Central Stand', latitude: 12.7409, longitude: 77.8253, category: StopCategory.CITY_HUB, districtName: 'Krishnagiri' },
  { name: 'Pochampalli Town Stop', latitude: 12.3394, longitude: 78.3712, category: StopCategory.TOWN_STOP, districtName: 'Krishnagiri' },
  { name: 'Bargur Village Stop', latitude: 12.5401, longitude: 78.3612, category: StopCategory.VILLAGE_STOP, districtName: 'Krishnagiri' },
  { name: 'Shoolagiri Bypass', latitude: 12.6712, longitude: 77.9902, category: StopCategory.TOWN_STOP, districtName: 'Krishnagiri' },

  // Madurai
  { name: 'Madurai Mattuthavani Stand', latitude: 9.9324, longitude: 78.1561, category: StopCategory.CITY_HUB, districtName: 'Madurai' },
  { name: 'Madurai Arappalayam Stand', latitude: 9.9304, longitude: 78.1021, category: StopCategory.CITY_HUB, districtName: 'Madurai' },
  { name: 'Melur Town Stand', latitude: 9.9961, longitude: 78.3308, category: StopCategory.TOWN_STOP, districtName: 'Madurai' },
  { name: 'Thirumangalam Bus Stand', latitude: 9.8242, longitude: 77.9912, category: StopCategory.CITY_HUB, districtName: 'Madurai' },
  { name: 'Kottampatty Village Stop', latitude: 10.2056, longitude: 78.4124, category: StopCategory.VILLAGE_STOP, districtName: 'Madurai' },
  { name: 'Vadipatti Village Stop', latitude: 10.0801, longitude: 77.9621, category: StopCategory.VILLAGE_STOP, districtName: 'Madurai' },
  { name: 'Usilampatti Town Stand', latitude: 9.9702, longitude: 77.8012, category: StopCategory.TOWN_STOP, districtName: 'Madurai' },

  // Mayiladuthurai
  { name: 'Mayiladuthurai Bus Stand', latitude: 11.1012, longitude: 79.6502, category: StopCategory.CITY_HUB, districtName: 'Mayiladuthurai' },
  { name: 'Sirkazhi Bus Stand', latitude: 11.2384, longitude: 79.7342, category: StopCategory.CITY_HUB, districtName: 'Mayiladuthurai' },
  { name: 'Tharangambadi Town Stop', latitude: 11.0345, longitude: 79.8491, category: StopCategory.TOWN_STOP, districtName: 'Mayiladuthurai' },
  { name: 'Vaitheeswarankoil Stop', latitude: 11.2001, longitude: 79.7121, category: StopCategory.TOWN_STOP, districtName: 'Mayiladuthurai' },
  { name: 'Kuthalam Village Stop', latitude: 11.0691, longitude: 79.5492, category: StopCategory.VILLAGE_STOP, districtName: 'Mayiladuthurai' },

  // Nagapattinam
  { name: 'Nagapattinam Bus Stand', latitude: 10.7645, longitude: 79.8421, category: StopCategory.CITY_HUB, districtName: 'Nagapattinam' },
  { name: 'Vedaranyam Bus Stand', latitude: 10.3745, longitude: 79.7812, category: StopCategory.CITY_HUB, districtName: 'Nagapattinam' },
  { name: 'Velankanni Bus Stand', latitude: 10.6812, longitude: 79.8491, category: StopCategory.CITY_HUB, districtName: 'Nagapattinam' },
  { name: 'Thirukkuvalai Village Stop', latitude: 10.5991, longitude: 79.7021, category: StopCategory.VILLAGE_STOP, districtName: 'Nagapattinam' },
  { name: 'Kilvelur Stop', latitude: 10.7301, longitude: 79.7192, category: StopCategory.TOWN_STOP, districtName: 'Nagapattinam' },

  // Namakkal
  { name: 'Namakkal Bus Stand', latitude: 11.2184, longitude: 78.1672, category: StopCategory.CITY_HUB, districtName: 'Namakkal' },
  { name: 'Rasipuram Bus Stand', latitude: 11.4124, longitude: 78.1891, category: StopCategory.TOWN_STOP, districtName: 'Namakkal' },
  { name: 'Tiruchengode Bus Stand', latitude: 11.3784, longitude: 77.8902, category: StopCategory.TOWN_STOP, districtName: 'Namakkal' },
  { name: 'Paramathi Velur Stop', latitude: 11.1091, longitude: 78.0112, category: StopCategory.TOWN_STOP, districtName: 'Namakkal' },
  { name: 'Kolli Hills Bypass', latitude: 11.2991, longitude: 78.3392, category: StopCategory.VILLAGE_STOP, districtName: 'Namakkal' },

  // Nilgiris
  { name: 'Ooty Bus Stand', latitude: 11.4102, longitude: 76.6950, category: StopCategory.CITY_HUB, districtName: 'The Nilgiris' },
  { name: 'Coonoor Bus Stand', latitude: 11.3530, longitude: 76.7959, category: StopCategory.TOWN_STOP, districtName: 'The Nilgiris' },
  { name: 'Gudalur Bus Stand', latitude: 11.5012, longitude: 76.4912, category: StopCategory.CITY_HUB, districtName: 'The Nilgiris' },
  { name: 'Kotagiri Town Stop', latitude: 11.4312, longitude: 76.8812, category: StopCategory.TOWN_STOP, districtName: 'The Nilgiris' },
  { name: 'Masinagudi Village Stop', latitude: 11.5712, longitude: 76.6402, category: StopCategory.VILLAGE_STOP, districtName: 'The Nilgiris' },

  // Perambalur
  { name: 'Perambalur Bus Stand', latitude: 11.2341, longitude: 78.8742, category: StopCategory.CITY_HUB, districtName: 'Perambalur' },
  { name: 'Veppanthattai Town Stop', latitude: 11.3321, longitude: 78.8291, category: StopCategory.TOWN_STOP, districtName: 'Perambalur' },
  { name: 'Alathur Town Stop', latitude: 11.1394, longitude: 78.9102, category: StopCategory.TOWN_STOP, districtName: 'Perambalur' },
  { name: 'Padalur Tollgate', latitude: 11.2335, longitude: 78.8856, category: StopCategory.VILLAGE_STOP, districtName: 'Perambalur' },
  { name: 'Kunnam Village Stop', latitude: 11.2291, longitude: 79.0302, category: StopCategory.VILLAGE_STOP, districtName: 'Perambalur' },

  // Pudukkottai
  { name: 'Pudukkottai Bus Stand', latitude: 10.3804, longitude: 78.8205, category: StopCategory.CITY_HUB, districtName: 'Pudukkottai' },
  { name: 'Aranthangi Bus Stand', latitude: 10.1624, longitude: 78.9902, category: StopCategory.CITY_HUB, districtName: 'Pudukkottai' },
  { name: 'Viralimalai Town Stop', latitude: 10.5982, longitude: 78.5402, category: StopCategory.TOWN_STOP, districtName: 'Pudukkottai' },
  { name: 'Keeranur Town Stop', latitude: 10.5701, longitude: 78.7891, category: StopCategory.TOWN_STOP, districtName: 'Pudukkottai' },
  { name: 'Illuppur Village Stop', latitude: 10.5112, longitude: 78.6302, category: StopCategory.VILLAGE_STOP, districtName: 'Pudukkottai' },

  // Ramanathapuram
  { name: 'Ramanathapuram Bus Stand', latitude: 9.3672, longitude: 78.8302, category: StopCategory.CITY_HUB, districtName: 'Ramanathapuram' },
  { name: 'Rameswaram Bus Stand', latitude: 9.2884, longitude: 79.3129, category: StopCategory.CITY_HUB, districtName: 'Ramanathapuram' },
  { name: 'Paramakudi Bus Stand', latitude: 9.5428, longitude: 78.5912, category: StopCategory.CITY_HUB, districtName: 'Ramanathapuram' },
  { name: 'Keezhakarai Town Stop', latitude: 9.2312, longitude: 78.7812, category: StopCategory.TOWN_STOP, districtName: 'Ramanathapuram' },
  { name: 'Mudukulathur Village Stop', latitude: 9.3391, longitude: 78.5102, category: StopCategory.VILLAGE_STOP, districtName: 'Ramanathapuram' },

  // Ranipet
  { name: 'Ranipet Bus Stand', latitude: 12.9272, longitude: 79.3302, category: StopCategory.CITY_HUB, districtName: 'Ranipet' },
  { name: 'Arakkonam Bus Stand', latitude: 13.0850, longitude: 79.6712, category: StopCategory.CITY_HUB, districtName: 'Ranipet' },
  { name: 'Arcot Bus Stand', latitude: 12.9056, longitude: 79.3312, category: StopCategory.CITY_HUB, districtName: 'Ranipet' },
  { name: 'Walajapet Town Stop', latitude: 12.9312, longitude: 79.3602, category: StopCategory.TOWN_STOP, districtName: 'Ranipet' },
  { name: 'Sholinghur Village Stop', latitude: 13.1112, longitude: 79.4212, category: StopCategory.VILLAGE_STOP, districtName: 'Ranipet' },

  // Salem
  { name: 'Salem MGR Terminal', latitude: 11.6643, longitude: 78.1460, category: StopCategory.CITY_HUB, districtName: 'Salem' },
  { name: 'Attur Bus Stand', latitude: 11.5971, longitude: 78.5984, category: StopCategory.CITY_HUB, districtName: 'Salem' },
  { name: 'Mettur Dam Bus Stand', latitude: 11.7991, longitude: 77.8012, category: StopCategory.CITY_HUB, districtName: 'Salem' },
  { name: 'Omalur Town Stop', latitude: 11.7402, longitude: 78.0701, category: StopCategory.TOWN_STOP, districtName: 'Salem' },
  { name: 'Yercaud Town Stop', latitude: 11.7794, longitude: 78.2091, category: StopCategory.TOWN_STOP, districtName: 'Salem' },
  { name: 'Deevattipatti Village Stop', latitude: 11.8351, longitude: 78.0902, category: StopCategory.VILLAGE_STOP, districtName: 'Salem' },

  // Sivaganga
  { name: 'Sivaganga Bus Stand', latitude: 9.8431, longitude: 78.4812, category: StopCategory.CITY_HUB, districtName: 'Sivaganga' },
  { name: 'Karaikudi Bus Stand', latitude: 10.0682, longitude: 78.7812, category: StopCategory.CITY_HUB, districtName: 'Sivaganga' },
  { name: 'Devakottai Bus Stand', latitude: 9.9491, longitude: 78.8241, category: StopCategory.CITY_HUB, districtName: 'Sivaganga' },
  { name: 'Kalayarkoil Village Stop', latitude: 9.8491, longitude: 78.6302, category: StopCategory.VILLAGE_STOP, districtName: 'Sivaganga' },
  { name: 'Manamadurai Town Stop', latitude: 9.7021, longitude: 78.4512, category: StopCategory.TOWN_STOP, districtName: 'Sivaganga' },

  // Tenkasi
  { name: 'Tenkasi Bus Stand', latitude: 8.9591, longitude: 77.3121, category: StopCategory.CITY_HUB, districtName: 'Tenkasi' },
  { name: 'Sengottai Bus Stand', latitude: 8.9812, longitude: 77.2491, category: StopCategory.CITY_HUB, districtName: 'Tenkasi' },
  { name: 'Sankarankovil Bus Stand', latitude: 9.1712, longitude: 77.5302, category: StopCategory.CITY_HUB, districtName: 'Tenkasi' },
  { name: 'Courtallam Stop', latitude: 8.9341, longitude: 77.2791, category: StopCategory.TOWN_STOP, districtName: 'Tenkasi' },
  { name: 'Kadayanallur Town Stop', latitude: 9.0801, longitude: 77.3402, category: StopCategory.TOWN_STOP, districtName: 'Tenkasi' },

  // Thanjavur
  { name: 'Thanjavur New Bus Stand', latitude: 10.7870, longitude: 79.1378, category: StopCategory.CITY_HUB, districtName: 'Thanjavur' },
  { name: 'Kumbakonam Central Stand', latitude: 10.9602, longitude: 79.3852, category: StopCategory.CITY_HUB, districtName: 'Thanjavur' },
  { name: 'Pattukkottai Bus Stand', latitude: 10.4302, longitude: 79.3192, category: StopCategory.CITY_HUB, districtName: 'Thanjavur' },
  { name: 'Sengipatti Village Stop', latitude: 10.7513, longitude: 78.9664, category: StopCategory.VILLAGE_STOP, districtName: 'Thanjavur' },
  { name: 'Papanasam Town Stop', latitude: 10.9251, longitude: 79.2812, category: StopCategory.TOWN_STOP, districtName: 'Thanjavur' },
  { name: 'Thiruvidaimarudur Village Stop', latitude: 10.9921, longitude: 79.4621, category: StopCategory.VILLAGE_STOP, districtName: 'Thanjavur' },

  // Theni
  { name: 'Theni Bus Stand', latitude: 10.0102, longitude: 77.4812, category: StopCategory.CITY_HUB, districtName: 'Theni' },
  { name: 'Bodinayakanur Bus Stand', latitude: 10.0101, longitude: 77.3512, category: StopCategory.CITY_HUB, districtName: 'Theni' },
  { name: 'Cumbum Bus Stand', latitude: 9.7391, longitude: 77.2902, category: StopCategory.CITY_HUB, districtName: 'Theni' },
  { name: 'Andipatti Village Stop', latitude: 9.9981, longitude: 77.6321, category: StopCategory.VILLAGE_STOP, districtName: 'Theni' },
  { name: 'Periyakulam Town Stop', latitude: 10.1192, longitude: 77.5492, category: StopCategory.TOWN_STOP, districtName: 'Theni' },

  // Thoothukudi
  { name: 'Thoothukudi Central Stand', latitude: 8.7991, longitude: 78.1342, category: StopCategory.CITY_HUB, districtName: 'Thoothukudi' },
  { name: 'Kovilpatti Bus Stand', latitude: 9.1791, longitude: 77.8712, category: StopCategory.CITY_HUB, districtName: 'Thoothukudi' },
  { name: 'Tiruchendur Bus Stand', latitude: 8.4901, longitude: 78.1292, category: StopCategory.CITY_HUB, districtName: 'Thoothukudi' },
  { name: 'Ettayapuram Town Stop', latitude: 9.1501, longitude: 77.9992, category: StopCategory.TOWN_STOP, districtName: 'Thoothukudi' },
  { name: 'Vilathikulam Village Stop', latitude: 9.1321, longitude: 78.1702, category: StopCategory.VILLAGE_STOP, districtName: 'Thoothukudi' },

  // Tiruchirappalli
  { name: 'Trichy Central Bus Stand', latitude: 10.7905, longitude: 78.7047, category: StopCategory.CITY_HUB, districtName: 'Tiruchirappalli' },
  { name: 'Srirangam Bus Stand', latitude: 10.8621, longitude: 78.6902, category: StopCategory.CITY_HUB, districtName: 'Tiruchirappalli' },
  { name: 'Lalgudi Bus Stand', latitude: 10.8691, longitude: 78.8241, category: StopCategory.CITY_HUB, districtName: 'Tiruchirappalli' },
  { name: 'Manapparai Bus Stand', latitude: 10.6056, longitude: 78.4192, category: StopCategory.CITY_HUB, districtName: 'Tiruchirappalli' },
  { name: 'Thuvakudi stop', latitude: 10.7483, longitude: 78.8092, category: StopCategory.TOWN_STOP, districtName: 'Tiruchirappalli' },
  { name: 'Thuvarankurichi Bypass', latitude: 10.3956, longitude: 78.4312, category: StopCategory.VILLAGE_STOP, districtName: 'Tiruchirappalli' },

  // Tirunelveli
  { name: 'Tirunelveli Junction', latitude: 8.7284, longitude: 77.7112, category: StopCategory.CITY_HUB, districtName: 'Tirunelveli' },
  { name: 'Tirunelveli New Bus Stand', latitude: 8.7112, longitude: 77.6912, category: StopCategory.CITY_HUB, districtName: 'Tirunelveli' },
  { name: 'Ambasamudram Bus Stand', latitude: 8.7012, longitude: 77.4512, category: StopCategory.CITY_HUB, districtName: 'Tirunelveli' },
  { name: 'Valliyur Bus Stand', latitude: 8.3812, longitude: 77.6192, category: StopCategory.CITY_HUB, districtName: 'Tirunelveli' },
  { name: 'Nanguneri Village Stop', latitude: 8.4891, longitude: 77.6591, category: StopCategory.VILLAGE_STOP, districtName: 'Tirunelveli' },
  { name: 'Radhapuram Village Stop', latitude: 8.2612, longitude: 77.6802, category: StopCategory.VILLAGE_STOP, districtName: 'Tirunelveli' },

  // Tirupathur
  { name: 'Tirupathur Bus Stand', latitude: 12.4912, longitude: 78.5601, category: StopCategory.CITY_HUB, districtName: 'Tirupathur' },
  { name: 'Vaniyambadi Bus Stand', latitude: 12.6841, longitude: 78.6112, category: StopCategory.TOWN_STOP, districtName: 'Tirupathur' },
  { name: 'Ambur Bus Stand', latitude: 12.7891, longitude: 78.7102, category: StopCategory.TOWN_STOP, districtName: 'Tirupathur' },
  { name: 'Yelagiri Hills Stop', latitude: 12.5791, longitude: 78.6391, category: StopCategory.VILLAGE_STOP, districtName: 'Tirupathur' },
  { name: 'Natrampalli Village Stop', latitude: 12.6102, longitude: 78.5492, category: StopCategory.VILLAGE_STOP, districtName: 'Tirupathur' },

  // Tiruppur
  { name: 'Tiruppur Central Stand', latitude: 11.1085, longitude: 77.3411, category: StopCategory.CITY_HUB, districtName: 'Tiruppur' },
  { name: 'Dharapuram Bus Stand', latitude: 10.7302, longitude: 77.5241, category: StopCategory.TOWN_STOP, districtName: 'Tiruppur' },
  { name: 'Kangeyam Bus Stand', latitude: 11.0091, longitude: 77.5612, category: StopCategory.TOWN_STOP, districtName: 'Tiruppur' },
  { name: 'Udumalaipettai Bus Stand', latitude: 10.5891, longitude: 77.2491, category: StopCategory.TOWN_STOP, districtName: 'Tiruppur' },
  { name: 'Avinashi Town Stop', latitude: 11.1912, longitude: 77.2691, category: StopCategory.TOWN_STOP, districtName: 'Tiruppur' },
  { name: 'Oddanchatram Bus Stand', latitude: 10.4851, longitude: 77.6804, category: StopCategory.TOWN_STOP, districtName: 'Tiruppur' },

  // Tiruvallur
  { name: 'Tiruvallur Bus Stand', latitude: 13.1438, longitude: 79.9079, category: StopCategory.CITY_HUB, districtName: 'Tiruvallur' },
  { name: 'Avadi Bus Stand', latitude: 13.1167, longitude: 80.1012, category: StopCategory.TOWN_STOP, districtName: 'Tiruvallur' },
  { name: 'Poonamallee Terminus', latitude: 13.0494, longitude: 80.0984, category: StopCategory.TOWN_STOP, districtName: 'Tiruvallur' },
  { name: 'Tiruttani Bus Stand', latitude: 13.1891, longitude: 79.6102, category: StopCategory.TOWN_STOP, districtName: 'Tiruvallur' },
  { name: 'Gummidipoondi Bypass', latitude: 13.4091, longitude: 80.1245, category: StopCategory.VILLAGE_STOP, districtName: 'Tiruvallur' },

  // Tiruvannamalai
  { name: 'Tiruvannamalai Bus Stand', latitude: 12.2272, longitude: 79.0712, category: StopCategory.CITY_HUB, districtName: 'Tiruvannamalai' },
  { name: 'Arani Bus Stand', latitude: 12.6712, longitude: 79.2842, category: StopCategory.TOWN_STOP, districtName: 'Tiruvannamalai' },
  { name: 'Cheyyar Bus Stand', latitude: 12.6591, longitude: 79.5402, category: StopCategory.TOWN_STOP, districtName: 'Tiruvannamalai' },
  { name: 'Polur Town Stop', latitude: 12.5112, longitude: 79.1292, category: StopCategory.TOWN_STOP, districtName: 'Tiruvannamalai' },
  { name: 'Chengam Village Stop', latitude: 12.3012, longitude: 78.8012, category: StopCategory.VILLAGE_STOP, districtName: 'Tiruvannamalai' },

  // Tiruvarur
  { name: 'Tiruvarur Bus Stand', latitude: 10.7712, longitude: 79.6302, category: StopCategory.CITY_HUB, districtName: 'Tiruvarur' },
  { name: 'Mannargudi Bus Stand', latitude: 10.6691, longitude: 79.4412, category: StopCategory.TOWN_STOP, districtName: 'Tiruvarur' },
  { name: 'Thiruthuraipoondi Bus Stand', latitude: 10.5312, longitude: 79.6402, category: StopCategory.TOWN_STOP, districtName: 'Tiruvarur' },
  { name: 'Nannilam Town Stop', latitude: 10.8812, longitude: 79.6102, category: StopCategory.TOWN_STOP, districtName: 'Tiruvarur' },
  { name: 'Kudavasal Village Stop', latitude: 10.8712, longitude: 79.4902, category: StopCategory.VILLAGE_STOP, districtName: 'Tiruvarur' },

  // Vellore
  { name: 'Vellore New Bus Stand', latitude: 12.9165, longitude: 79.1325, category: StopCategory.CITY_HUB, districtName: 'Vellore' },
  { name: 'Gudiyatham Bus Stand', latitude: 12.9491, longitude: 78.8702, category: StopCategory.TOWN_STOP, districtName: 'Vellore' },
  { name: 'Katpadi Junction Stop', latitude: 12.9691, longitude: 79.1394, category: StopCategory.TOWN_STOP, districtName: 'Vellore' },
  { name: 'Anaicut Village Stop', latitude: 12.8712, longitude: 79.0102, category: StopCategory.VILLAGE_STOP, districtName: 'Vellore' },
  { name: 'Kaniyambadi Village Stop', latitude: 12.8212, longitude: 79.1412, category: StopCategory.VILLAGE_STOP, districtName: 'Vellore' },

  // Viluppuram
  { name: 'Villupuram Bus Stand', latitude: 11.9401, longitude: 79.4861, category: StopCategory.CITY_HUB, districtName: 'Villupuram' },
  { name: 'Tindivanam Bypass', latitude: 12.2272, longitude: 79.6502, category: StopCategory.TOWN_STOP, districtName: 'Villupuram' },
  { name: 'Gingee Town Stop', latitude: 12.2512, longitude: 79.4192, category: StopCategory.TOWN_STOP, districtName: 'Villupuram' },
  { name: 'Marakkanam Village Stop', latitude: 12.1901, longitude: 79.9402, category: StopCategory.VILLAGE_STOP, districtName: 'Villupuram' },
  { name: 'Valavanur Village Stop', latitude: 11.9161, longitude: 79.5601, category: StopCategory.VILLAGE_STOP, districtName: 'Villupuram' },

  // Virudhunagar
  { name: 'Virudhunagar Bus Stand', latitude: 9.5841, longitude: 77.9502, category: StopCategory.CITY_HUB, districtName: 'Virudhunagar' },
  { name: 'Sivakasi Bus Stand', latitude: 9.4542, longitude: 77.8012, category: StopCategory.CITY_HUB, districtName: 'Virudhunagar' },
  { name: 'Rajapalayam Bus Stand', latitude: 9.4431, longitude: 77.5612, category: StopCategory.CITY_HUB, districtName: 'Virudhunagar' },
  { name: 'Aruppukottai Bus Stand', latitude: 9.5112, longitude: 78.1002, category: StopCategory.TOWN_STOP, districtName: 'Virudhunagar' },
  { name: 'Srivilliputhur Town Stop', latitude: 9.5101, longitude: 77.6302, category: StopCategory.TOWN_STOP, districtName: 'Virudhunagar' },
];

const TN_ROUTES = [
  {
    number: '570',
    name: 'CMBT to Kelambakkam (MTC)',
    description: 'Chennai MTC route connecting Koyambedu CMBT to OMR IT Corridor',
    corporation: CorporationType.MTC,
    serviceType: ServiceType.DELUXE,
    isFreeForWomen: false,
    stops: [
      'Chennai Koyambedu Hub',
      'MMDA Colony',
      'Jaffarkhanpet',
      'Guindy Hub',
      'Velachery',
      'SRP Tools',
      'Thoraipakkam',
      'Sholinganallur',
      'Siruseri IT Park',
      'Kelambakkam',
    ],
  },
  {
    number: '102',
    name: 'Broadway to Kelambakkam (MTC)',
    description: 'Chennai MTC route connecting North Chennai Terminus to OMR Kelambakkam',
    corporation: CorporationType.MTC,
    serviceType: ServiceType.ORDINARY,
    isFreeForWomen: true,
    stops: [
      'Broadway Terminus',
      'Mylapore',
      'Adyar Mandaveli',
      'SRP Tools',
      'Kandanchavadi',
      'Thoraipakkam',
      'Karapakkam',
      'Sholinganallur',
      'Semmancheri',
      'Navalur',
      'Siruseri IT Park',
      'Kelambakkam',
    ],
  },
  {
    number: '21G',
    name: 'Broadway to Tambaram (MTC)',
    description: 'Chennai MTC classic trunk line running via Anna Salai / Mount Road corridor',
    corporation: CorporationType.MTC,
    serviceType: ServiceType.ORDINARY,
    isFreeForWomen: true,
    stops: [
      'Broadway Terminus',
      'Central Railway Station',
      'LIC',
      'Mount Road',
      'Teynampet',
      'Nandanam',
      'Saidapet',
      'Guindy Hub',
      'Pallavaram',
      'Chromepet',
      'Tambaram',
    ],
  },
  {
    number: '500',
    name: 'Tambaram to Chengalpattu (MTC)',
    description: 'Chennai MTC suburban service connecting Tambaram hub to Southern gateway Chengalpattu',
    corporation: CorporationType.MTC,
    serviceType: ServiceType.DELUXE,
    isFreeForWomen: false,
    stops: [
      'Tambaram',
      'Perungalathur',
      'Vandalur Zoo',
      'Guduvancheri',
      'Singaperumal Koil',
      'Mahindra World City',
      'Chengalpattu Junction Stand',
    ],
  },
  {
    number: 'A1',
    name: 'Central Station to Thiruvanmiyur (MTC)',
    description: 'Chennai MTC beach corridor link connecting Central Station to East Coast gateway',
    corporation: CorporationType.MTC,
    serviceType: ServiceType.ORDINARY,
    isFreeForWomen: true,
    stops: [
      'Central Railway Station',
      'Egmore',
      'Triplicane',
      'Santhome',
      'Mylapore',
      'Adyar Mandaveli',
      'Thiruvanmiyur',
    ],
  },
  {
    number: 'TNSTC-CBE-503',
    name: 'Coimbatore to Madurai (TNSTC-CBE)',
    description: 'Western-Southern corridor passenger route running via Singanallur and Oddanchatram',
    corporation: CorporationType.TNSTC_COIMBATORE,
    serviceType: ServiceType.DELUXE,
    isFreeForWomen: false,
    stops: [
      'Coimbatore Gandhipuram Stand',
      'Singanallur Bus Stand',
      'Palladam Bus Stand',
      'Kangeyam Bus Stand',
      'Dharapuram Bus Stand',
      'Oddanchatram Bus Stand',
      'Dindigul Bus Stand',
      'Madurai Arappalayam Stand',
    ],
  },
  {
    number: 'TNSTC-MDU-605',
    name: 'Madurai to Kanyakumari (TNSTC-MDU)',
    description: 'Direct Southern express line connecting Temple City to the Land End point',
    corporation: CorporationType.TNSTC_MADURAI,
    serviceType: ServiceType.DELUXE,
    isFreeForWomen: false,
    stops: [
      'Madurai Mattuthavani Stand',
      'Virudhunagar Bus Stand',
      'Kovilpatti Bus Stand',
      'Tirunelveli Junction',
      'Nagercoil Christopher Stand',
      'Kanyakumari Beach Road',
    ],
  },
  {
    number: 'SETC-101',
    name: 'Chennai to Madurai (SETC)',
    description: 'Express intercity route connecting Capital to Temple City via NH 38',
    corporation: CorporationType.SETC,
    serviceType: ServiceType.ULTRA_DELUXE,
    isFreeForWomen: false,
    stops: [
      'Chennai Koyambedu Hub',
      'Tambaram',
      'Tindivanam Bypass',
      'Villupuram Bus Stand',
      'Padalur Tollgate',
      'Trichy Central Bus Stand',
      'Dindigul Bus Stand',
      'Madurai Mattuthavani Stand',
    ],
  },
  {
    number: 'SETC-202',
    name: 'Chennai to Coimbatore (SETC)',
    description: 'AC Sleeper intercity route connecting Chennai to Textile Hub via NH 544',
    corporation: CorporationType.SETC,
    serviceType: ServiceType.AC_SLEEPER,
    isFreeForWomen: false,
    stops: [
      'Chennai Koyambedu Hub',
      'Kanchipuram Bus Stand',
      'Vellore New Bus Stand',
      'Dharmapuri Hub',
      'Salem MGR Terminal',
      'Erode Central Stand',
      'Coimbatore Gandhipuram Stand',
    ],
  },
  {
    number: 'TNSTC-CBE-501',
    name: 'Coimbatore to Ooty (TNSTC-CBE)',
    description: 'Scenic hill route connecting Western plains to Nilgiris queen of hills',
    corporation: CorporationType.TNSTC_COIMBATORE,
    serviceType: ServiceType.DELUXE,
    isFreeForWomen: false,
    stops: [
      'Coimbatore Gandhipuram Stand',
      'Mettupalayam Bus Stand',
      'Coonoor Bus Stand',
      'Ooty Bus Stand',
    ],
  },
  {
    number: 'TNSTC-MDU-601',
    name: 'Madurai to Trichy (TNSTC-MDU)',
    description: 'Town bus service connecting major Southern junctions and intermediate villages',
    corporation: CorporationType.TNSTC_MADURAI,
    serviceType: ServiceType.ORDINARY,
    isFreeForWomen: true,
    stops: [
      'Madurai Mattuthavani Stand',
      'Melur Town Stand',
      'Kottampatty Village Stop',
      'Thuvarankurichi Bypass',
      'Trichy Central Bus Stand',
    ],
  },
  {
    number: 'TNSTC-KUM-701',
    name: 'Trichy to Thanjavur (TNSTC-KUM)',
    description: 'Delta division route connecting Trichy and the historic temple city of Thanjavur',
    corporation: CorporationType.TNSTC_KUMBAKONAM,
    serviceType: ServiceType.ORDINARY,
    isFreeForWomen: true,
    stops: [
      'Trichy Central Bus Stand',
      'Thuvakudi stop',
      'Sengipatti Village Stop',
      'Thanjavur New Bus Stand',
    ],
  },
  {
    number: 'TNSTC-VL-801',
    name: 'Villupuram to Cuddalore (TNSTC-VL)',
    description: 'Local passenger route connecting Viluppuram to Cuddalore coastal town',
    corporation: CorporationType.TNSTC_VILLUPURAM,
    serviceType: ServiceType.ORDINARY,
    isFreeForWomen: true,
    stops: [
      'Villupuram Bus Stand',
      'Valavanur Village Stop',
      'Nellikuppam Town Stop',
      'Cuddalore Bus Stand',
    ],
  },
  {
    number: 'TNSTC-SLM-901',
    name: 'Salem to Dharmapuri (TNSTC-SLM)',
    description: 'Mofussil service linking Salem city terminal to Dharmapuri through Toppur ghats',
    corporation: CorporationType.TNSTC_SALEM,
    serviceType: ServiceType.ORDINARY,
    isFreeForWomen: true,
    stops: [
      'Salem MGR Terminal',
      'Omalur Town Stop',
      'Deevattipatti Village Stop',
      'Toppur Tollgate',
      'Dharmapuri Hub',
    ],
  },
  {
    number: 'TNSTC-TRY-301',
    name: 'Trichy to Pudukkottai (TNSTC-KUM)',
    description: 'Regional passenger route connecting Trichy and Pudukkottai municipalities',
    corporation: CorporationType.TNSTC_KUMBAKONAM,
    serviceType: ServiceType.ORDINARY,
    isFreeForWomen: true,
    stops: [
      'Trichy Central Bus Stand',
      'Viralimalai Town Stop',
      'Keeranur Town Stop',
      'Pudukkottai Bus Stand',
    ],
  },
  {
    number: 'SETC-404',
    name: 'Chennai to Kanyakumari (SETC)',
    description: 'Long-distance intercity sleeper route travelling the entire length of NH 38/44',
    corporation: CorporationType.SETC,
    serviceType: ServiceType.AC_SLEEPER,
    isFreeForWomen: false,
    stops: [
      'Chennai Koyambedu Hub',
      'Villupuram Bus Stand',
      'Trichy Central Bus Stand',
      'Madurai Mattuthavani Stand',
      'Tirunelveli Junction',
      'Nagercoil Christopher Stand',
      'Kanyakumari Beach Road',
    ],
  },
  {
    number: 'TNSTC-MDU-602',
    name: 'Madurai to Theni (TNSTC-MDU)',
    description: 'Scenic regional town route connecting foothills of Western ghats to Madurai',
    corporation: CorporationType.TNSTC_MADURAI,
    serviceType: ServiceType.ORDINARY,
    isFreeForWomen: true,
    stops: [
      'Madurai Mattuthavani Stand',
      'Vadipatti Village Stop',
      'Usilampatti Town Stand',
      'Andipatti Village Stop',
      'Theni Bus Stand',
    ],
  },
  {
    number: 'TNSTC-CBE-502',
    name: 'Coimbatore to Pollachi (TNSTC-CBE)',
    description: 'Western local town service linking Coimbatore metropolitan to coconut hub Pollachi',
    corporation: CorporationType.TNSTC_COIMBATORE,
    serviceType: ServiceType.ORDINARY,
    isFreeForWomen: true,
    stops: [
      'Coimbatore Gandhipuram Stand',
      'Othakkalmandapam Village Stop',
      'Kinathukadavu Town Stop',
      'Pollachi Bus Stand',
    ],
  },
  {
    number: 'TNSTC-KUM-702',
    name: 'Thanjavur to Kumbakonam (TNSTC-KUM)',
    description: 'Delta mofussil service connecting major temple circles and agricultural towns',
    corporation: CorporationType.TNSTC_KUMBAKONAM,
    serviceType: ServiceType.ORDINARY,
    isFreeForWomen: true,
    stops: [
      'Thanjavur New Bus Stand',
      'Papanasam Town Stop',
      'Thiruvidaimarudur Village Stop',
      'Kumbakonam Central Stand',
    ],
  },
  {
    number: 'SETC-505',
    name: 'Salem to Hosur (SETC)',
    description: 'Northern industrial corridor link connecting Salem to Hosur manufacturing border hub',
    corporation: CorporationType.SETC,
    serviceType: ServiceType.DELUXE,
    isFreeForWomen: false,
    stops: [
      'Salem MGR Terminal',
      'Dharmapuri Hub',
      'Krishnagiri Bypass',
      'Hosur Central Stand',
    ],
  },
  {
    number: 'TNSTC-MDU-603',
    name: 'Madurai to Rameshwaram Express (TNSTC-MDU)',
    description: 'Fast express link connecting Temple city to Rameshwaram island pilgrimage centre',
    corporation: CorporationType.TNSTC_MADURAI,
    serviceType: ServiceType.DELUXE,
    isFreeForWomen: false,
    stops: [
      'Madurai Mattuthavani Stand',
      'Manamadurai Town Stop',
      'Paramakudi Bus Stand',
      'Ramanathapuram Bus Stand',
      'Rameswaram Bus Stand',
    ],
  },
  {
    number: 'TNSTC-VL-802',
    name: 'Vellore to Tirupathur Local (TNSTC-VL)',
    description: 'West-northern local link connecting Vellore town to Tirupathur blocks',
    corporation: CorporationType.TNSTC_VILLUPURAM,
    serviceType: ServiceType.ORDINARY,
    isFreeForWomen: true,
    stops: [
      'Vellore New Bus Stand',
      'Katpadi Junction Stop',
      'Gudiyatham Bus Stand',
      'Vaniyambadi Bus Stand',
      'Tirupathur Bus Stand',
    ],
  },
  {
    number: 'TNSTC-KUM-703',
    name: 'Thanjavur to Nagapattinam (TNSTC-KUM)',
    description: 'East coastal delta line linking historic Thanjavur to sea port Nagapattinam',
    corporation: CorporationType.TNSTC_KUMBAKONAM,
    serviceType: ServiceType.ORDINARY,
    isFreeForWomen: true,
    stops: [
      'Thanjavur New Bus Stand',
      'Kumbakonam Central Stand',
      'Mayiladuthurai Bus Stand',
      'Nagapattinam Bus Stand',
      'Velankanni Bus Stand',
    ],
  },
  {
    number: 'TNSTC-TEN-704',
    name: 'Tirunelveli to Tenkasi Mofussil (TNSTC-TEN)',
    description: 'Deep southern foothills route linking Tirunelveli hub to Western border ranges',
    corporation: CorporationType.TNSTC_TIRUNELVELI,
    serviceType: ServiceType.ORDINARY,
    isFreeForWomen: true,
    stops: [
      'Tirunelveli New Bus Stand',
      'Ambasamudram Bus Stand',
      'Courtallam Stop',
      'Tenkasi Bus Stand',
      'Sengottai Bus Stand',
    ],
  },
  {
    number: 'TNSTC-MDU-604',
    name: 'Virudhunagar to Sivakasi (TNSTC-MDU)',
    description: 'Industrial commuter route connecting firecracker hub Sivakasi to Virudhunagar',
    corporation: CorporationType.TNSTC_MADURAI,
    serviceType: ServiceType.ORDINARY,
    isFreeForWomen: true,
    stops: [
      'Virudhunagar Bus Stand',
      'Sivakasi Bus Stand',
      'Rajapalayam Bus Stand',
      'Srivilliputhur Town Stop',
    ],
  },
  {
    number: 'TNSTC-VL-803',
    name: 'Tiruvannamalai to Vellore (TNSTC-VL)',
    description: 'Inter-district route connecting temple hub Tiruvannamalai to Vellore fort city',
    corporation: CorporationType.TNSTC_VILLUPURAM,
    serviceType: ServiceType.ORDINARY,
    isFreeForWomen: true,
    stops: [
      'Tiruvannamalai Bus Stand',
      'Polur Town Stop',
      'Anaicut Village Stop',
      'Vellore New Bus Stand',
    ],
  },
  {
    number: 'MTC-405',
    name: 'Tiruvallur to Koyambedu Suburban (MTC)',
    description: 'West Chennai MTC suburban connection route for daily commuters',
    corporation: CorporationType.MTC,
    serviceType: ServiceType.ORDINARY,
    isFreeForWomen: true,
    stops: [
      'Tiruvallur Bus Stand',
      'Poonamallee Terminus',
      'Avadi Bus Stand',
      'Chennai Koyambedu Hub',
    ],
  },
  {
    number: 'TNSTC-KUM-705',
    name: 'Tiruvarur to Nagapattinam Local (TNSTC-KUM)',
    description: 'Short delta feeder link connecting Tiruvarur fields to coastal Nagapattinam',
    corporation: CorporationType.TNSTC_KUMBAKONAM,
    serviceType: ServiceType.ORDINARY,
    isFreeForWomen: true,
    stops: [
      'Tiruvarur Bus Stand',
      'Kudavasal Village Stop',
      'Nagapattinam Bus Stand',
    ],
  },
];

function generateVehicleNo(corp: CorporationType): string {
  const districts = ['TN01', 'TN57', 'TN38', 'TN45', 'TN30', 'TN59', 'TN72', 'TN49', 'TN32', 'TN23', 'TN15', 'TN69', 'TN74', 'TN75', 'TN81'];
  const district = districts[Math.floor(Math.random() * districts.length)];
  const letters = String.fromCharCode(
    65 + Math.floor(Math.random() * 26),
    65 + Math.floor(Math.random() * 26)
  );
  const numbers = String(Math.floor(Math.random() * 9000) + 1000);
  return `${district}${letters}${numbers}`;
}

async function main() {
  console.log('Starting state-wide Tamil Nadu seed...');

  // Teardown existing tables
  await prisma.authLog.deleteMany();
  await prisma.favoriteRoute.deleteMany();
  await prisma.fcmToken.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.bus.deleteMany();
  await prisma.routeStop.deleteMany();
  await prisma.stop.deleteMany();
  await prisma.route.deleteMany();
  await prisma.district.deleteMany();
  await prisma.user.deleteMany();
  await prisma.mapProviderConfig.deleteMany();

  // Create districts
  const districtMap = new Map<string, string>();
  for (const d of TAMIL_NADU_DISTRICTS) {
    const district = await prisma.district.create({
      data: {
        name: d.name,
        region: d.region,
      },
    });
    districtMap.set(d.name, district.id);
  }

  // Create all stops catalog
  const stopMap = new Map<string, string>();
  for (const stop of TN_STOPS_CATALOG) {
    const districtId = districtMap.get(stop.districtName) || null;
    const createdStop = await prisma.stop.create({
      data: {
        name: stop.name,
        latitude: stop.latitude,
        longitude: stop.longitude,
        category: stop.category,
        districtId: districtId,
      },
    });
    stopMap.set(stop.name, createdStop.id);
  }

  // Create demo user
  const passwordHash = await hash('Demo1234!', 12);
  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@bustrack.app',
      passwordHash,
      name: 'Demo User',
      phone: '+919876543210',
    },
  });

  const routesList = [];
  
  // Seed routes, link stops, and seed buses
  for (const routeData of TN_ROUTES) {
    const route = await prisma.route.create({
      data: {
        number: routeData.number,
        name: routeData.name,
        description: routeData.description,
        corporation: routeData.corporation,
      },
    });

    // Link stops to routes with RouteStop
    for (const [index, stopName] of routeData.stops.entries()) {
      const stopId = stopMap.get(stopName);
      if (!stopId) {
        throw new Error(`Stop '${stopName}' not found in stops catalog during route seeding`);
      }
      await prisma.routeStop.create({
        data: {
          routeId: route.id,
          stopId: stopId,
          sequence: index + 1,
        },
      });
    }

    routesList.push(route);

    // Seed buses for this route
    const busCount = 3; // 3 active buses running simulation offsets per route
    for (let index = 0; index < busCount; index += 1) {
      await prisma.bus.create({
        data: {
          vehicleNo: generateVehicleNo(routeData.corporation),
          busNumber: route.number,
          routeId: route.id,
          status: BusStatus.ACTIVE,
          capacity: 40 + Math.floor(Math.random() * 20),
          serviceType: routeData.serviceType,
          isFreeForWomen: routeData.isFreeForWomen,
          isLowFloor: index % 2 === 0,
        },
      });
    }
  }

  // Map Provider Config
  await prisma.mapProviderConfig.create({
    data: {
      providerName: 'google',
      isActive: true,
      usageLimitPerDay: 200000,
      fallbackEnabled: true,
    },
  });

  // Favorite route shortcut for demo user
  if (routesList[0]) {
    await prisma.favoriteRoute.create({
      data: {
        userId: demoUser.id,
        routeId: routesList[0].id,
      },
    });
  }

  console.log(`Seeded ${TAMIL_NADU_DISTRICTS.length} districts, ${TN_STOPS_CATALOG.length} stops, ${routesList.length} Tamil Nadu state-wide routes, and ${routesList.length * 3} buses.`);
}

main()
  .catch((error) => {
    console.error('State seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
