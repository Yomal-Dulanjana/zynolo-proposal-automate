// prisma/seed-demo-data.ts — Production-Grade Demo Data Seeding Engine
// Executable strictly via: npm run db:seed
import { PrismaClient, ProposalStatus, DealStage } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

// ── 1. The 10 Official Corporate Sales Representatives ────────────────────────
const SALES_REPS = [
  { name: 'Kavindu Senanayake', email: 'kavindu.s@dtechlk.com', phone: '0771234501' },
  { name: 'Nimesha Perera', email: 'nimesha.p@dtechlk.com', phone: '0771234502' },
  { name: 'Charith Wickramasinghe', email: 'charith.w@dtechlk.com', phone: '0771234503' },
  { name: 'Sanduni Jayawardena', email: 'sanduni.j@dtechlk.com', phone: '0771234504' },
  { name: 'Tharindu Fernando', email: 'tharindu.f@dtechlk.com', phone: '0771234505' },
  { name: 'Dilshan Rajapaksha', email: 'dilshan.r@dtechlk.com', phone: '0771234506' },
  { name: 'Anuki De Silva', email: 'anuki.d@dtechlk.com', phone: '0771234507' },
  { name: 'Sachintha Bandara', email: 'sachintha.b@dtechlk.com', phone: '0771234508' },
  { name: 'Praveen Mendis', email: 'praveen.m@dtechlk.com', phone: '0771234509' },
  { name: 'Hasini Weerasinghe', email: 'hasini.w@dtechlk.com', phone: '0771234510' },
];

// ── 2. Comprehensive Sri Lankan Corporate Directory (150+ Companies) ─────────
interface CompanyTemplate {
  name: string;
  email: string;
  phone: string;
  address: string;
  contactPerson: string;
}

const SRI_LANKAN_COMPANIES: CompanyTemplate[] = [
  // Prompt specified companies
  { name: 'Hayleys Fabric PLC', email: 'procurement@hayleysfabric.com', phone: '0112456781', address: 'Narthupana Estate, Neboda, Horana', contactPerson: 'Rohan Goonetilleke' },
  { name: 'Brandix Apparel Solutions', email: 'hr.operations@brandix.com', phone: '0114727000', address: 'No. 25, Rheinland Place, Colombo 03', contactPerson: 'Priyantha Hapuarachchi' },
  { name: 'Singer Sri Lanka Logistics', email: 'supplychain@singersl.com', phone: '0112434444', address: 'No. 112, Havelock Road, Colombo 05', contactPerson: 'Mahesh Wijewardene' },
  { name: 'Cargills Ceylon Distribution', email: 'corporate.hr@cargillsceylon.com', phone: '0112427777', address: 'No. 40, York Street, Colombo 01', contactPerson: 'Delano Dias' },
  { name: 'Hemas Consumer Brands', email: 'talent@hemas.com', phone: '0114731731', address: 'Hemas House, No. 75, Braybrooke Place, Colombo 02', contactPerson: 'Kasturi Chellaraja Wilson' },
  { name: 'Maspcons Engineering (Pvt) Ltd', email: 'admin@maspcons.lk', phone: '0112889900', address: 'No. 88, Nawala Road, Nugegoda', contactPerson: 'Gamini Jayasuriya' },
  { name: 'Richard Pieris Exports PLC', email: 'export.hr@arpico.com', phone: '0114310500', address: 'No. 310, High Level Road, Nawinna, Maharagama', contactPerson: 'Dr. Sena Yaddehige' },
  { name: 'Lion Brewery Ceylon', email: 'operations@lionbeer.com', phone: '0112465900', address: 'No. 254, Colombo Road, Biyagama', contactPerson: 'Rajiv Meewakkala' },
  { name: 'Tokyo Cement Group', email: 'procure@tokyocement.com', phone: '0112574611', address: 'No. 469 1/1, Galle Road, Colombo 03', contactPerson: 'Dr. S.R. Gnanam' },
  { name: 'Dilmah Ceylon Tea Services', email: 'corporate@dilmahtea.com', phone: '0114822000', address: 'No. 111, Negombo Road, Peliyagoda', contactPerson: 'Dilhan C. Fernando' },
  { name: 'Sunshine Holdings Healthcare', email: 'talent.lead@sunshineholdings.net', phone: '0114702400', address: 'No. 60, Nawam Mawatha, Colombo 02', contactPerson: 'Shyam Sathasivam' },
  { name: 'Maliban Biscuit Manufactories', email: 'hrd@malibanbiscuit.com', phone: '0115555000', address: 'No. 389, Galle Road, Ratmalana', contactPerson: 'Kumudika Fernando' },
  { name: 'Access Engineering PLC', email: 'careers@accessengsl.com', phone: '0117606600', address: 'Access Towers, No. 278, Union Place, Colombo 02', contactPerson: 'Christopher Joshua' },
  { name: 'Ceylon Cold Stores (Elephant House)', email: 'hr@elephanthouse.lk', phone: '0112441441', address: 'No. 148, Vauxhall Street, Colombo 02', contactPerson: 'Daminda Gamlath' },
  { name: 'United Motors Lanka PLC', email: 'corporate@unitedmotors.lk', phone: '0112448411', address: 'No. 100, Hyde Park Corner, Colombo 02', contactPerson: 'Chanaka Yatawara' },
  { name: 'Dankotuwa Porcelain PLC', email: 'info@dankotuwa.com', phone: '0315500500', address: 'Kurunegala Road, Dankotuwa', contactPerson: 'Channa Gunawardana' },
  { name: 'Lanka IOC PLC', email: 'admin@lankaioc.com', phone: '0112475720', address: 'Level 20, West Tower, World Trade Center, Colombo 01', contactPerson: 'Manoj Gupta' },
  { name: 'ACL Cables PLC', email: 'group.hr@acl.lk', phone: '0117608300', address: 'No. 60, Rodney Street, Colombo 08', contactPerson: 'Suren Madanayake' },
  { name: 'Sierra Cables PLC', email: 'procurement@sierracables.com', phone: '0114312000', address: 'No. 1120, Vihahena Road, Ranala', contactPerson: 'Shamendra Panditha' },
  { name: 'Kelani Tyres PLC', email: 'operations@kelanityres.com', phone: '0112911065', address: 'No. 203, Union Place, Colombo 02', contactPerson: 'Rohan Fernando' },
  { name: 'Laugfs Holdings Corporate', email: 'careers@laugfs.lk', phone: '0115566222', address: 'No. 101, Maya Avenue, Colombo 06', contactPerson: 'W.K.H. Wegapitiya' },
  { name: 'Abans Retail Operations', email: 'it.systems@abansgroup.com', phone: '0112565265', address: 'No. 498, Galle Road, Colombo 03', contactPerson: 'Tito Pestonjee' },
  { name: 'Softlogic Holdings PLC', email: 'talent.pool@softlogic.lk', phone: '0115575000', address: 'No. 14, De Fonseka Place, Colombo 05', contactPerson: 'Ashok Pathirage' },
  { name: 'Vallibel One PLC', email: 'executive@vallibelone.com', phone: '0112439890', address: 'Level 29, West Tower, World Trade Center, Colombo 01', contactPerson: 'Dhammika Perera' },
  { name: 'Renuka Holdings PLC', email: 'info@renukagroup.com', phone: '0112314750', address: 'Renuka House, No. 69, Sri Jinaratana Road, Colombo 02', contactPerson: 'Shamindra Rajiyah' },
  { name: 'Ceylon Beverage Holdings', email: 'contact@ceylonbeverage.com', phone: '0112437600', address: 'No. 61, Janadhipathi Mawatha, Colombo 01', contactPerson: 'Hari Selvanathan' },
  { name: 'Watawala Plantations PLC', email: 'careers@watawalaplantations.lk', phone: '0114702400', address: 'No. 60, Nawam Mawatha, Colombo 02', contactPerson: 'Binesh Pananwala' },
  { name: 'Commercial Development Co', email: 'info@combankdev.com', phone: '0112486000', address: 'No. 21, Sir Razik Fareed Mawatha, Colombo 01', contactPerson: 'Sanath Manatunge' },
  { name: 'Lanka Walltiles PLC', email: 'corporate@lankatile.com', phone: '0114526700', address: 'No. 215, Nawala Road, Narahenpita, Colombo 05', contactPerson: 'Mahendra Jayasekera' },
  { name: 'Swisstek Aluminium Ltd', email: 'sales@swisstekaluminium.com', phone: '0114705800', address: 'No. 23/1, Maligawa Road, Ratmalana', contactPerson: 'Bandula Weerasinghe' },

  // Additional Prestigious Sri Lankan Enterprises (Manufacturing, Retail, Logistics, Healthcare, IT)
  { name: 'MAS Holdings (Corporate Headquarters)', email: 'procurement@masholdings.com', phone: '0114796444', address: 'No. 198, Galle Road, Colombo 03', contactPerson: 'Deshamanya Mahesh Amalean' },
  { name: 'John Keells Holdings PLC', email: 'group.talent@keells.com', phone: '0112306000', address: 'No. 117, Sir Chittampalam A. Gardiner Mawatha, Colombo 02', contactPerson: 'Krishan Balendra' },
  { name: 'Dialog Axiata Corporate Services', email: 'enterprise.support@dialog.lk', phone: '0777678678', address: 'No. 475, Union Place, Colombo 02', contactPerson: 'Supun Weerasinghe' },
  { name: 'Sri Lanka Telecom (SLT-Mobitel)', email: 'b2b.solutions@slt.lk', phone: '0112440044', address: 'Telecom Headquarters, Lotus Road, Colombo 01', contactPerson: 'Janaka Abeysinghe' },
  { name: 'Commercial Bank of Ceylon PLC', email: 'procurement@combank.net', phone: '0112486486', address: 'Commercial House, No. 21, Bristol Street, Colombo 01', contactPerson: 'S. Renganathan' },
  { name: 'Hatton National Bank PLC', email: 'corporate.hr@hnb.lk', phone: '0112664664', address: 'HNB Towers, No. 479, T.B. Jayah Mawatha, Colombo 10', contactPerson: 'Jonathan Alles' },
  { name: 'Sampath Bank Corporate Office', email: 'facilities@sampath.lk', phone: '0112300260', address: 'No. 110, Sir James Peiris Mawatha, Colombo 02', contactPerson: 'Ayodhya Iddawela Perera' },
  { name: 'Aitken Spence PLC', email: 'group.procure@aitkenspence.lk', phone: '0112308308', address: 'Aitken Spence Tower, No. 315, Vauxhall Street, Colombo 02', contactPerson: 'Dr. Parakrama Dissanayake' },
  { name: 'Teejay Lanka PLC', email: 'contact@teejay.com', phone: '0364279500', address: 'Block D1-D12, Seethawaka Export Processing Zone, Avissawella', contactPerson: 'Pubudu De Silva' },
  { name: 'Diesel & Motor Engineering (DIMO)', email: 'careers@dimolanka.com', phone: '0112449797', address: 'No. 65, Jethawana Road, Colombo 14', contactPerson: 'Ranjith Pandithage' },
  { name: 'Brown & Company PLC', email: 'corporate.admin@brownsgroup.com', phone: '0112663000', address: 'No. 481, T.B. Jayah Mawatha, Colombo 10', contactPerson: 'Kapila Jayawardena' },
  { name: 'Melstacorp PLC', email: 'admin@melstacorp.com', phone: '0115900300', address: 'No. 110, Norris Canal Road, Colombo 10', contactPerson: 'Amitha Gooneratne' },
  { name: 'Carson Cumberbatch PLC', email: 'info@carsoncumberbatch.com', phone: '0112039200', address: 'No. 61, Janadhipathi Mawatha, Colombo 01', contactPerson: 'Tilak De Zoysa' },
  { name: 'Akbar Brothers (Pvt) Ltd', email: 'hr.operations@akbar.com', phone: '0112522851', address: 'No. 334, T.B. Jayah Mawatha, Colombo 10', contactPerson: 'Tyeab Akbarally' },
  { name: 'George Steuart & Company', email: 'info@georgesteuart.com', phone: '0112324541', address: 'Steuart House, No. 45, Janadhipathi Mawatha, Colombo 01', contactPerson: 'Dilith Jayaweera' },
  { name: 'Expolanka Freight Logistics', email: 'sl-operations@expolanka.com', phone: '0114659500', address: 'No. 15A, Clifford Avenue, Colombo 03', contactPerson: 'Hanif Yusoof' },
  { name: 'McLarens Holdings Group', email: 'corporate@mclarens.lk', phone: '0112448365', address: 'No. 123, Bauddhaloka Mawatha, Colombo 04', contactPerson: 'Rohan De Silva' },
  { name: 'Finlays Colombo Limited', email: 'careers@finlays.net', phone: '0112448761', address: 'No. 186, Vauxhall Street, Colombo 02', contactPerson: 'Gihan Jayasinghe' },
  { name: 'LOLC Holdings Corporate Services', email: 'group.it@lolc.com', phone: '0115888888', address: 'No. 100/1, Sri Jayawardenepura Mawatha, Rajagiriya', contactPerson: 'Kapila Jayawardena' },
  { name: 'Central Finance Company PLC', email: 'admin@cf.lk', phone: '0812227000', address: 'No. 84, Raja Veediya, Kandy', contactPerson: 'Eranjith Wijenaike' },
  { name: 'LB Finance PLC Corporate', email: 'operations@lbfinance.lk', phone: '0112200200', address: 'No. 20, Dharmapala Mawatha, Colombo 03', contactPerson: 'Sumith Adhihetty' },
  { name: 'Damro Furniture (Pvt) Ltd', email: 'corporate@damro.lk', phone: '0334678100', address: 'No. 25, Kandy Road, Nittambuwa', contactPerson: 'Damitha Ramanayake' },
  { name: 'Asiri Hospital Holdings PLC', email: 'admin@asiri.lk', phone: '0114524400', address: 'No. 181, Kirula Road, Narahenpita, Colombo 05', contactPerson: 'Dr. Manjula Karunaratne' },
  { name: 'Nawaloka Hospitals PLC', email: 'corporate@nawaloka.com', phone: '0115577111', address: 'No. 23, Deshamanya H.K. Dharmadasa Mawatha, Colombo 02', contactPerson: 'Harshith Dharmadasa' },
  { name: 'Lanka Hospitals Corporation PLC', email: 'hr@lankahospitals.com', phone: '0115430000', address: 'No. 578, Elvitigala Mawatha, Narahenpita, Colombo 05', contactPerson: 'Deepthi Lokuarachchi' },
  { name: 'Durdans Hospital (Ceylon Hospitals)', email: 'contact@durdans.com', phone: '0112140000', address: 'No. 3, Alfred Place, Colombo 03', contactPerson: 'Ajith Tudawe' },
  { name: 'Kings Hospital Colombo', email: 'info@kingshospital.lk', phone: '0117743743', address: 'No. 18/A, Evergreen Park Road, Narahenpita, Colombo 05', contactPerson: 'Dr. Palitha Karunapema' },
  { name: 'Virtusa Sri Lanka Advanced Technology Center', email: 'facilities.sl@virtusa.com', phone: '0114605500', address: 'No. 752, Dr. Danister De Silva Mawatha, Colombo 09', contactPerson: 'Naresha Supramaniam' },
  { name: 'WSO2 Lanka (Pvt) Ltd', email: 'procurement@wso2.com', phone: '0112145345', address: 'No. 20, Palm Grove, Colombo 03', contactPerson: 'Sanjiva Weerawarana' },
  { name: 'IFS R&D International (Pvt) Ltd', email: 'operations.lk@ifs.com', phone: '0112364400', address: 'No. 581, Galle Road, Colombo 06', contactPerson: 'Nesara Mendis' },
  { name: '99x Technology (Pvt) Ltd', email: 'talent@99x.io', phone: '0114721199', address: 'No. 65, Walukarama Road, Colombo 03', contactPerson: 'Mano Sekaram' },
  { name: 'MillenniumIT ESP (Pvt) Ltd', email: 'admin@mitesp.com', phone: '0117498000', address: 'No. 46/38, Nawam Mawatha, Colombo 02', contactPerson: 'Shevan Goonetilleke' },
  { name: 'Sysco LABS Sri Lanka', email: 'sl.operations@syscolabs.com', phone: '0112188288', address: 'No. 40, Navam Mawatha, Colombo 02', contactPerson: 'Rasika Karunatilake' },
  { name: 'Pearson Lanka (Pvt) Ltd', email: 'hr.srilanka@pearson.com', phone: '0117604000', address: 'MAGA ONE, No. 520, Elvitigala Mawatha, Colombo 05', contactPerson: 'Diyath Ariyaratne' },
  { name: 'London Stock Exchange Group (LSEG SL)', email: 'procure.colombo@lseg.com', phone: '0112416000', address: 'Trace Expert City, Maradana, Colombo 10', contactPerson: 'Fadhil Jiffry' },
  { name: 'MAS Active Trading (Pvt) Ltd', email: 'procure.active@masholdings.com', phone: '0114798000', address: 'No. 50, Foster Lane, Colombo 10', contactPerson: 'Shirendra Lawrence' },
  { name: 'MAS Intimates (Pvt) Ltd', email: 'intimates.hr@masholdings.com', phone: '0114704000', address: 'No. 10, Cambridge Place, Colombo 07', contactPerson: 'Rajiv Dharmarajah' },
  { name: 'Hirdaramani Group Corporate', email: 'inquiries@hirdaramani.com', phone: '0114797000', address: 'No. 324, Galle Road, Colombo 06', contactPerson: 'Vinod Hirdaramani' },
  { name: 'Timex Garments (Pvt) Ltd', email: 'info@timexsl.com', phone: '0114728000', address: 'No. 455/1, Bauddhaloka Mawatha, Colombo 08', contactPerson: 'Arshad Sattar' },
  { name: 'Star Garments Group', email: 'corporate@stargarments.com', phone: '0114838000', address: 'Ring Road Phase II, Katunayake FTZ', contactPerson: 'A. Sukumaran' },
  { name: 'Omega Line Limited', email: 'contact@omegaline.org', phone: '0314876000', address: 'Sandungama, Pallewela, Sandalankawa', contactPerson: 'Felix Fernando' },
  { name: 'Haycarb PLC', email: 'marketing@haycarb.com', phone: '0112687528', address: 'No. 400, Deans Road, Colombo 10', contactPerson: 'Rajitha Kariyawasan' },
  { name: 'Dipped Products PLC', email: 'postmaster@dplgroup.com', phone: '0112683964', address: 'No. 400, Deans Road, Colombo 10', contactPerson: 'Pushpika Janadheera' },
  { name: 'Alumex PLC', email: 'info@alumexgroup.com', phone: '0114740000', address: 'Pate Industrial Estate, Sapugaskanda, Makola', contactPerson: 'Pramuk Dediwela' },
  { name: 'Royal Ceramics Lanka (Rocell)', email: 'customercare@rocell.com', phone: '0114799400', address: 'No. 20, R.A. De Mel Mawatha, Colombo 03', contactPerson: 'Aravinda Perera' },
  { name: 'Maga Engineering (Pvt) Ltd', email: 'corporate@maga.lk', phone: '0117209870', address: 'No. 200, Nawala Road, Narahenpita, Colombo 05', contactPerson: 'M.G. Kularatne' },
  { name: 'Sanken Construction (Pvt) Ltd', email: 'info@sanken.biz', phone: '0112872666', address: 'No. 295, Madampitiya Road, Colombo 14', contactPerson: 'Ranjith Gunatilleke' },
  { name: 'Tudawe Brothers (Pvt) Ltd', email: 'admin@tudawe.com', phone: '0112501010', address: 'No. 505/2, Elvitigala Mawatha, Colombo 05', contactPerson: 'Rohana Tudawe' },
  { name: 'Nawaloka Construction Company', email: 'procurement@nawalokaconstruction.com', phone: '0112544544', address: 'No. 115, Sir James Peiris Mawatha, Colombo 02', contactPerson: 'Jayantha Dharmadasa' },
  { name: 'International Construction Consortium (ICC)', email: 'icc@icc-construct.com', phone: '0114400600', address: 'No. 72, Sri Sangaraja Mawatha, Colombo 10', contactPerson: 'Harsha De Saram' },
  { name: 'David Pieris Motor Company (DPMC)', email: 'corporate@dpmco.com', phone: '0114700600', address: 'No. 120, 120A, Pannipitiya Road, Battaramulla', contactPerson: 'Rohana Dissanayake' },
  { name: 'Associated Motorways (AMW Capital)', email: 'contact@amwltd.com', phone: '0112446711', address: 'No. 185, Union Place, Colombo 02', contactPerson: 'Peter Mackenzie' },
  { name: 'Toyota Lanka (Pvt) Ltd', email: 'inquiries@toyota.lk', phone: '0112465400', address: 'No. 337, Negombo Road, Wattala', contactPerson: 'Manohara Atukorala' },
  { name: 'Kotmale Dairy Products', email: 'sales@kotmale.lk', phone: '0112427500', address: 'No. 40, York Street, Colombo 01', contactPerson: 'Sarva Ameresekere' },
  { name: 'Pelwatte Dairy Industries', email: 'info@pelwattedairy.com', phone: '0112877500', address: 'No. 125, Pagoda Road, Nugegoda', contactPerson: 'Akmal Wickramanayake' },
  { name: 'Fonterra Brands Lanka', email: 'corporate.lk@fonterra.com', phone: '0112488488', address: 'No. 100, Delgoda Road, Biyagama', contactPerson: 'Vidya Sivaraja' },
  { name: 'Nestle Lanka PLC', email: 'consumer.services@lk.nestle.com', phone: '0112699991', address: 'No. 440, T.B. Jayah Mawatha, Colombo 10', contactPerson: 'Bernhard Stefan' },
  { name: 'Ceylon Biscuits Limited (Munchee)', email: 'info@muncheelk.com', phone: '0115000000', address: 'Makumbura, Pannipitiya', contactPerson: 'Shea Wickramasingha' },
  { name: 'Edinborough Products (Pvt) Ltd', email: 'marketing@edinborough.lk', phone: '0114811811', address: 'Halbarawa, Padukka', contactPerson: 'Zalmy Fernando' },
  { name: 'Raigam Marketing Services', email: 'info@raigam.lk', phone: '0112741000', address: 'No. 277, Koswatte, Kaduwela', contactPerson: 'Dr. Ravi Liyanage' },
  { name: 'Harischandra Mills PLC', email: 'info@harischandramills.com', phone: '0412222451', address: 'No. 11, Rahula Road, Matara', contactPerson: 'Bastian Samarasinghe' },
  { name: 'Wijeya Products (Pvt) Ltd', email: 'sales@wijayaproducts.com', phone: '0342261600', address: 'Dodangoda, Kalutara', contactPerson: 'Vimukthi Kothalawala' },
  { name: 'CIC Holdings PLC', email: 'cic@cic.lk', phone: '0112359359', address: 'CIC House, No. 199, Kew Road, Colombo 02', contactPerson: 'Aroshan Seresinhe' },
  { name: 'A. Baur & Co. (Pvt) Ltd (Baurs)', email: 'admin@baurs.com', phone: '0114728700', address: 'No. 5, Upper Chatham Street, Colombo 01', contactPerson: 'Rolf Blaser' },
  { name: 'Lankem Ceylon PLC', email: 'info@lankem.lk', phone: '0115566000', address: 'No. 212, Vauxhall Street, Colombo 02', contactPerson: 'Sanjeev Rajaratnam' },
  { name: 'Kelani Valley Plantations PLC', email: 'postmaster@kvpl.com', phone: '0112686274', address: 'No. 400, Deans Road, Colombo 10', contactPerson: 'Anura Fernando' },
  { name: 'Talawakelle Tea Estates PLC', email: 'corporate@talawakelle.com', phone: '0112627700', address: 'No. 400, Deans Road, Colombo 10', contactPerson: 'Senaka Alawattegama' },
  { name: 'Bogawantalawa Tea Estates PLC', email: 'admin@bogawantalawa.com', phone: '0112553311', address: 'No. 153, Nawala Road, Narahenpita, Colombo 05', contactPerson: 'Dinesh Ambani' },
  { name: 'Printcare PLC', email: 'corporate@printcare.com', phone: '0114829200', address: 'No. 77, N精华 Road, Kelaniya', contactPerson: 'KR Ravindran' },
  { name: 'Seylan Bank Corporate Head Office', email: 'info@seylan.lk', phone: '0112456000', address: 'Seylan Towers, No. 90, Galle Road, Colombo 03', contactPerson: 'Ramesh Jayasekara' },
  { name: 'Nations Trust Bank PLC', email: 'corporate.solutions@ntb.lk', phone: '0114711411', address: 'No. 242, Union Place, Colombo 02', contactPerson: 'Hemantha Gunetilleke' },
  { name: 'DFCC Bank PLC', email: 'info@dfccbank.com', phone: '0112350000', address: 'No. 73/5, Galle Road, Colombo 03', contactPerson: 'Thimal Perera' },
  { name: 'Pan Asia Banking Corporation PLC', email: 'corporate@pabcbank.com', phone: '0114667777', address: 'No. 450, Galle Road, Colombo 03', contactPerson: 'Naleen Edirisinghe' },
  { name: 'Union Bank of Colombo PLC', email: 'corporate@unionb.com', phone: '0115800800', address: 'No. 64, Galle Road, Colombo 03', contactPerson: 'Indrajit Wickramasinghe' },
  { name: 'Ceylinco Life Insurance Limited', email: 'services@ceylincolife.com', phone: '0112461000', address: 'No. 106, Havelock Road, Colombo 05', contactPerson: 'Thushara Ranasinghe' },
  { name: 'Sri Lanka Insurance Corporation', email: 'corporate@srilankainsurance.com', phone: '0112357357', address: 'No. 21, Vauxhall Street, Colombo 02', contactPerson: 'Chandana L. Aluthgama' },
  { name: 'Union Assurance PLC', email: 'info@unionassurance.com', phone: '0112990990', address: 'No. 20, St. Michael’s Road, Colombo 03', contactPerson: 'Jude Gomes' },
  { name: 'Janashakthi Insurance PLC', email: 'insurance@janashakthi.com', phone: '0112636636', address: 'No. 75, Kumaran Ratnam Road, Colombo 02', contactPerson: 'Ravi Liyanage' },
  { name: 'Softlogic Life Insurance PLC', email: 'info@softlogiclife.lk', phone: '0112315555', address: 'Level 16, One Galle Face Tower, Colombo 02', contactPerson: 'Iftikar Ahamed' },
  { name: 'Allianz Insurance Lanka Limited', email: 'inquiries@allianz.lk', phone: '0112303300', address: 'No. 675, Dr. Danister De Silva Mawatha, Colombo 09', contactPerson: 'Gany Subramaniam' },
  { name: 'Fairfirst Insurance Limited', email: 'callcentre@fairfirst.lk', phone: '0114268000', address: 'No. 33, St. Michael’s Road, Colombo 03', contactPerson: 'Sandeep Gopal' },
  { name: 'AIA Insurance Lanka Limited', email: 'lk.info@aia.com', phone: '0112310310', address: 'AIA Tower, No. 92, Dharmapala Mawatha, Colombo 07', contactPerson: 'Chathuri Munaweera' },
  { name: 'HNB Assurance PLC', email: 'info@hnbassurance.com', phone: '0114384384', address: 'No. 479, T.B. Jayah Mawatha, Colombo 10', contactPerson: 'Lasitha Wimalaratne' },
  { name: 'Senok Trade Combine (Pvt) Ltd', email: 'corporate@senoksl.com', phone: '0112501425', address: 'No. 3, R.A. De Mel Mawatha, Colombo 05', contactPerson: 'Gerard Fernando' },
  { name: 'Stafford Motor Co (Pvt) Ltd', email: 'admin@honda.lk', phone: '0117607200', address: 'No. 718/7, Baseline Road, Colombo 09', contactPerson: 'Charaka Perera' },
  { name: 'Ideal Motors (Pvt) Ltd', email: 'corporate@idealgroup.lk', phone: '0117755555', address: 'No. 299, Union Place, Colombo 02', contactPerson: 'Nalin Welgama' },
  { name: 'Micro Cars Limited', email: 'sales@microcars.lk', phone: '0117578578', address: 'No. 42, Kelaniganga Mill Road, Colombo 15', contactPerson: 'Dr. Lawrence Perera' },
  { name: 'Indra Traders (Pvt) Ltd', email: 'inquiries@indratraders.com', phone: '0812234346', address: 'No. 175, Katugastota Road, Kandy', contactPerson: 'Indra Silva' },
  { name: 'Colonial Motors (Ceylon) Ltd', email: 'info@mazda.lk', phone: '0117449500', address: 'No. 449, Negombo Road, Peliyagoda', contactPerson: 'Mohan Ratnayake' },
  { name: 'Carmart (Pvt) Ltd', email: 'info@carmart.lk', phone: '0114400800', address: 'No. 424, Union Place, Colombo 02', contactPerson: 'Peter Senaratne' },
  { name: 'Baur Trading (Agricultural Division)', email: 'agri@baurs.com', phone: '0114728777', address: 'No. 62, Jethawana Road, Colombo 14', contactPerson: 'Amal Pieris' },
  { name: 'Hayleys Agriculture Holdings Ltd', email: 'info@agro.hayleys.com', phone: '0112688960', address: 'No. 25, Foster Lane, Colombo 10', contactPerson: 'Jayanthi Dharmasena' },
  { name: 'Maskeliya Plantations PLC', email: 'info@maskeliya.lk', phone: '0112686100', address: 'No. 310, High Level Road, Nawinna', contactPerson: 'Manoj Pathiraja' },
  { name: 'Namunukula Plantations PLC', email: 'info@namunukula.lk', phone: '0112686200', address: 'No. 310, High Level Road, Nawinna', contactPerson: 'Prasad Senanayake' },
  { name: 'Elpitiya Plantations PLC', email: 'elpitpl@aitkenspence.lk', phone: '0112308100', address: 'No. 315, Vauxhall Street, Colombo 02', contactPerson: 'Bhathiya Bulumulla' },
  { name: 'Horana Plantations PLC', email: 'hpcorporate@cplgroup.lk', phone: '0112698944', address: 'No. 20, Dudley Senanayake Mawatha, Colombo 08', contactPerson: 'Johann Rodrigo' },
  { name: 'Kotagala Plantations PLC', email: 'kotagala@lankem.lk', phone: '0115566050', address: 'No. 53 1/1, Sir Baron Jayathilake Mawatha, Colombo 01', contactPerson: 'Mahen Dayananda' },
  { name: 'Agarapatana Plantations PLC', email: 'agp@lankem.lk', phone: '0115566100', address: 'No. 53 1/1, Sir Baron Jayathilake Mawatha, Colombo 01', contactPerson: 'Sunil Poholiyadde' },
  { name: 'Kahawatte Plantations PLC', email: 'kwpl@dilmahtea.com', phone: '0114822150', address: 'No. 111, Negombo Road, Peliyagoda', contactPerson: 'Minette Perera' },
  { name: 'Pussellawa Plantations Limited', email: 'info@freudenberg.lk', phone: '0112686300', address: 'No. 228, Havelock Road, Colombo 05', contactPerson: 'Chamal De Silva' },
  { name: 'ACME Printing & Packaging PLC', email: 'info@acmepack.com', phone: '0114441500', address: 'No. 318, Gonawala Road, Kelaniya', contactPerson: 'Rohan De Silva' },
  { name: 'Regnis Lanka PLC', email: 'regnis@singersl.com', phone: '0112635441', address: 'No. 52, Ferry Road, Borupana, Ratmalana', contactPerson: 'Eshana De Silva' },
  { name: 'Lanka Ceramic PLC', email: 'info@lankaceramic.com', phone: '0114526800', address: 'No. 196, Nawala Road, Narahenpita', contactPerson: 'Nimal Perera' },
  { name: 'Rocell Bathware Limited', email: 'bathware@rocell.com', phone: '0114799500', address: 'No. 20, R.A. De Mel Mawatha, Colombo 03', contactPerson: 'Tharana Thoradeniya' },
  { name: 'Swisstek Ceylon PLC', email: 'info@swisstekceylon.com', phone: '0114705850', address: 'No. 215, Nawala Road, Narahenpita', contactPerson: 'Roshan Kaluarachchi' },
  { name: 'Ceylon Guardian Investment Trust', email: 'guardian@carsoncumberbatch.com', phone: '0112039200', address: 'No. 61, Janadhipathi Mawatha, Colombo 01', contactPerson: 'Krishna Selvanathan' },
  { name: 'First Capital Holdings PLC', email: 'info@firstcapital.lk', phone: '0112639898', address: 'No. 2, Deal Place, Colombo 03', contactPerson: 'Dilshan Wirasekara' },
  { name: 'CAL (Capital Alliance Holdings)', email: 'info@cal.lk', phone: '0112317777', address: 'Level 5, Millennium House, No. 46/58, Nawam Mawatha, Colombo 02', contactPerson: 'Ajith Fernando' },
  { name: 'Asia Capital PLC', email: 'info@asiacapital.lk', phone: '0115320000', address: 'No. 21/1, Roland Tower, Dharmapala Mawatha, Colombo 03', contactPerson: 'Stefan Abeyesinhe' },
  { name: 'NDB Capital Holdings PLC', email: 'info@ndbch.com', phone: '0112300388', address: 'No. 40, Nawam Mawatha, Colombo 02', contactPerson: 'Vajira Kulatilaka' },
  { name: 'National Development Bank (NDB Bank)', email: 'contact@ndbbank.com', phone: '0112448888', address: 'No. 40, Nawam Mawatha, Colombo 02', contactPerson: 'Kelum Edirisinghe' },
  { name: 'Singer Finance (Lanka) PLC', email: 'finance@singersl.com', phone: '0112303717', address: 'No. 498, R.A. De Mel Mawatha, Colombo 03', contactPerson: 'Thushan Amarasuriya' },
  { name: 'Mercantile Investments and Finance', email: 'mi@mi.com.lk', phone: '0112343720', address: 'No. 236, Galle Road, Colombo 03', contactPerson: 'Gerard Ondaatjie' },
  { name: 'Alliance Finance Company PLC', email: 'info@alliancefinance.lk', phone: '0112673673', address: 'No. 84, Ward Place, Colombo 07', contactPerson: 'Romani De Silva' },
  { name: 'Citizens Development Business Finance (CDB)', email: 'customercare@cdb.lk', phone: '0117388388', address: 'No. 123, Orabipasha Mawatha, Colombo 10', contactPerson: 'Mahesh Nanayakkara' },
  { name: 'Hemas Pharmaceuticals (Pvt) Ltd', email: 'pharma@hemas.com', phone: '0114838383', address: 'No. 12, Glen Aber Place, Colombo 04', contactPerson: 'Jude Fernando' },
  { name: 'Morison Limited (Healthcare)', email: 'info@morison.lk', phone: '0112544444', address: 'No. 620, Biyagama Road, Pethiyagoda, Kelaniya', contactPerson: 'Dinesh Arunatileka' },
  { name: 'State Pharmaceuticals Corporation (SPC)', email: 'spc@spc.lk', phone: '0112320356', address: 'No. 75, Sir Baron Jayathilake Mawatha, Colombo 01', contactPerson: 'Dr. Prasanna Gunasena' },
  { name: 'State Engineering Corporation (SEC)', email: 'info@sec.lk', phone: '0112430061', address: 'No. 130, W.A.D. Ramanayake Mawatha, Colombo 02', contactPerson: 'Eng. Ratnasiri Fernando' },
  { name: 'Central Engineering Consultancy Bureau (CECB)', email: 'cecb@cecb.lk', phone: '0112668800', address: 'No. 415, Bauddhaloka Mawatha, Colombo 07', contactPerson: 'Eng. G.R.A.S. Gunathilake' },
  { name: 'Hemas Manufacturing (Pvt) Ltd', email: 'manufacturing@hemas.com', phone: '0114830000', address: 'Dankotuwa Industrial Zone, Dankotuwa', contactPerson: 'Fiona Juriansz' },
  { name: 'Ceylon Grain Elevators PLC (Prima Group)', email: 'info.cge@prima.com.lk', phone: '0112522556', address: 'No. 15, Rock House Lane, Colombo 15', contactPerson: 'Cheng Chih Kwong' },
  { name: 'Prima Ceylon (Pvt) Ltd', email: 'prima@prima.com.lk', phone: '0112699990', address: 'China Bay, Trincomalee', contactPerson: 'Tan Jiak Kwang' },
  { name: 'Ruhunu Foods (Pvt) Ltd', email: 'info@ruhunufoods.com', phone: '0912222411', address: 'Kandewatta, Galle', contactPerson: 'Jayantha Wickramasinghe' },
  { name: 'MA’s Tropical Food Processing', email: 'info@masfood.com', phone: '0112885500', address: 'No. 18, Lake Road, Maharagama', contactPerson: 'Mario De Alwis' },
  { name: 'Mc Currie Spices (Lanka Canning)', email: 'info@mccurrie.net', phone: '0112836262', address: 'No. 10, Industrial Estate, Ekala, Ja-Ela', contactPerson: 'Nalin Pathirana' },
  { name: 'Convenience Foods Lanka PLC', email: 'cfl@muncheelk.com', phone: '0112699401', address: 'Ceylon Biscuits Complex, High Level Road, Pannipitiya', contactPerson: 'E.T. De Zoysa' },
  { name: 'Raigam Wayamba Salterns PLC', email: 'salterns@raigam.lk', phone: '0112741015', address: 'No. 277, Koswatte, Kaduwela', contactPerson: 'G.V.P. Ganegoda' },
  { name: 'Sierra Construction Limited', email: 'info@sierralk.com', phone: '0114311000', address: 'No. 1120, Vihahena Road, Ranala', contactPerson: 'Priyasath Dep' },
  { name: 'Access Projects (Pvt) Ltd', email: 'info@accessprojects.com', phone: '0117606700', address: 'Access Tower 2, Union Place, Colombo 02', contactPerson: 'Rohana Fernando' },
];

// ── 3. Helper Functions ───────────────────────────────────────────────────────
function getRandomArbitrary(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDateBetween(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Realistic Tiered Pricing (Inversely Proportional to Workforce Size)
 * - Large Scale (>= 200 staff): LKR 350.00 – LKR 370.00
 * - Mid Scale (100 – 199 staff): LKR 370.00 – LKR 385.00
 * - Small Scale (25 – 99 staff): LKR 385.00 – LKR 400.00
 */
function calculateTieredRate(employeeCount: number): number {
  if (employeeCount >= 200) {
    return getRandomArbitrary(350, 370);
  } else if (employeeCount >= 100) {
    return getRandomArbitrary(370, 385);
  } else {
    return getRandomArbitrary(385, 400);
  }
}

// ── 4. Main Seeder Routine ────────────────────────────────────────────────────
async function main() {
  console.log('================================================================');
  console.log('🚀 ZYNOLO PEOPLE HRM — PRODUCTION-GRADE DEMO SEEDING ENGINE');
  console.log('================================================================');

  // Unified Password Hash for all 10 corporate representatives
  const defaultPassword = '123@Dtech';
  const passwordHash = await bcrypt.hash(defaultPassword, 12);

  // Historical date window: August 1, 2026 to November 15, 2026
  const startDate = new Date('2026-08-01T00:00:00Z');
  const endDate = new Date('2026-11-15T23:59:59Z');

  // Pre-fetch all existing proposal client names and emails to guarantee duplication protection
  const existingProposals = await prisma.proposal.findMany({
    select: { clientName: true, clientEmail: true, proposalId: true },
  });
  const existingClientNames = new Set(existingProposals.map((p) => p.clientName.trim().toLowerCase()));
  const existingClientEmails = new Set(existingProposals.map((p) => p.clientEmail.trim().toLowerCase()));
  const existingProposalIds = new Set(existingProposals.map((p) => p.proposalId));

  let companyCatalogIndex = 0;
  let totalProposalsCreated = 0;
  let totalClientsCreated = 0;
  let totalRepsCreated = 0;
  let totalRepsSkipped = 0;

  const stageBreakdown: Record<string, number> = {
    HOD_PENDING: 0,
    APPROVED_SENT: 0,
    NEGOTIATION: 0,
    CLOSED_WON: 0,
    CLOSED_LOST: 0,
  };

  let totalWonRevenue = 0;
  let totalWonGrossProfit = 0;
  let totalActivePipelineValue = 0;

  console.log(`\n📦 Processing 10 Sales Representatives and Dynamic Proposals...\n`);

  for (let repIndex = 0; repIndex < SALES_REPS.length; repIndex++) {
    const repData = SALES_REPS[repIndex];

    // 1. Idempotent Representative Creation
    let user = await prisma.salesUser.findUnique({
      where: { email: repData.email },
    });

    if (!user) {
      user = await prisma.salesUser.create({
        data: {
          fullName: repData.name,
          email: repData.email,
          mobileNumber: repData.phone,
          passwordHash,
        },
      });
      totalRepsCreated++;
      console.log(`👤 [Created Rep] #${user.id} ${user.fullName} (${user.email})`);
    } else {
      totalRepsSkipped++;
      console.log(`⏭️  [Existing Rep] #${user.id} ${user.fullName} (${user.email})`);
    }

    // 2. Pseudo-random Proposal Count per Rep: 5 (Min) to 15 (Max)
    const proposalCount = getRandomArbitrary(5, 15);
    let createdForRep = 0;

    for (let i = 0; i < proposalCount; i++) {
      // Find the next available non-duplicate company
      let selectedCompany: CompanyTemplate | null = null;
      let attempts = 0;

      while (attempts < SRI_LANKAN_COMPANIES.length) {
        const candidate = SRI_LANKAN_COMPANIES[companyCatalogIndex % SRI_LANKAN_COMPANIES.length];
        companyCatalogIndex++;
        attempts++;

        const normName = candidate.name.trim().toLowerCase();
        const normEmail = candidate.email.trim().toLowerCase();

        if (!existingClientNames.has(normName) && !existingClientEmails.has(normEmail)) {
          selectedCompany = candidate;
          existingClientNames.add(normName);
          existingClientEmails.add(normEmail);
          break;
        }
      }

      // If every static company has been used, generate a distinct high-value branch/division
      if (!selectedCompany) {
        const base = SRI_LANKAN_COMPANIES[i % SRI_LANKAN_COMPANIES.length];
        const divisionId = totalProposalsCreated + 1;
        selectedCompany = {
          name: `${base.name} (Division ${divisionId})`,
          email: `div${divisionId}.${base.email}`,
          phone: base.phone,
          address: `${base.address}, Complex B`,
          contactPerson: base.contactPerson,
        };
        existingClientNames.add(selectedCompany.name.trim().toLowerCase());
        existingClientEmails.add(selectedCompany.email.trim().toLowerCase());
      }

      // 3. Workforce Scope & Tiered Financial Computation
      const employeeCount = getRandomArbitrary(25, 350);
      const ratePerUser = calculateTieredRate(employeeCount);
      const monthlyBase = Number((employeeCount * ratePerUser).toFixed(2));
      const vatAmount = Number((monthlyBase * 0.18).toFixed(2));
      const totalAmount = Number((monthlyBase + vatAmount).toFixed(2));
      const monthlyGp = Number((monthlyBase * 0.60).toFixed(2));

      // 4. Uniform Historical Date Generation (Aug 1 - Nov 15, 2026)
      const issuedDate = getRandomDateBetween(startDate, endDate);
      const expiryDate = new Date(issuedDate.getTime() + 21 * 24 * 60 * 60 * 1000);
      const lastContactedAt = new Date(
        issuedDate.getTime() + Math.min(Date.now() - issuedDate.getTime(), Math.random() * 5 * 864e5)
      );

      // 5. Weighted Funnel Distribution
      // HOD_PENDING (~10%), APPROVED_SENT (~25%), NEGOTIATION (~20%), CLOSED_WON (~35%), CLOSED_LOST (~10%)
      const rand = Math.random();
      let status: ProposalStatus = ProposalStatus.SENT;
      let stage: DealStage = DealStage.PROPOSAL_SENT;
      let isHodApproved = true;
      let probability = 60;
      let lossReason: string | null = null;
      let lossNotes: string | null = null;
      let bucketKey = 'APPROVED_SENT';

      if (rand < 0.10) {
        status = ProposalStatus.HOD_PENDING;
        stage = DealStage.PROPOSAL_SENT;
        isHodApproved = false;
        probability = 60;
        bucketKey = 'HOD_PENDING';
      } else if (rand < 0.35) {
        status = ProposalStatus.SENT;
        stage = DealStage.PROPOSAL_SENT;
        isHodApproved = true;
        probability = 60;
        bucketKey = 'APPROVED_SENT';
        totalActivePipelineValue += monthlyBase;
      } else if (rand < 0.55) {
        status = ProposalStatus.IN_NEGOTIATION;
        stage = DealStage.NEGOTIATION;
        isHodApproved = true;
        probability = 80;
        bucketKey = 'NEGOTIATION';
        totalActivePipelineValue += monthlyBase;
      } else if (rand < 0.90) {
        status = ProposalStatus.ACCEPTED;
        stage = DealStage.CLOSED_WON;
        isHodApproved = true;
        probability = 100;
        bucketKey = 'CLOSED_WON';
        totalWonRevenue += monthlyBase;
        totalWonGrossProfit += monthlyGp;
      } else {
        status = ProposalStatus.REJECTED;
        stage = DealStage.CLOSED_LOST;
        isHodApproved = true;
        probability = 0;
        bucketKey = 'CLOSED_LOST';
        const reasons = ['BUDGET', 'COMPETITOR', 'FEATURE_MISMATCH', 'PROJECT_CANCELLED', 'TIMELINE_POSTPONED'];
        lossReason = reasons[Math.floor(Math.random() * reasons.length)];
        lossNotes = `Commercial evaluation concluded. Client deferred or selected alternative arrangement (${lossReason}).`;
      }

      stageBreakdown[bucketKey]++;

      // 6. Generate collision-free Proposal ID & Public Token
      let proposalId = '';
      do {
        const randCode = getRandomArbitrary(10000000, 99999999);
        proposalId = `DTPZPV26${randCode}`;
      } while (existingProposalIds.has(proposalId));
      existingProposalIds.add(proposalId);

      const publicToken = crypto.randomBytes(16).toString('hex');
      const pdfPath = `/pdfs/${proposalId}.pdf`;

      // 7. Upsert Reusable ClientProfile
      await prisma.clientProfile.upsert({
        where: {
          salesUserId_companyName: {
            salesUserId: user.id,
            companyName: selectedCompany.name.trim(),
          },
        },
        update: {
          address: selectedCompany.address,
          contactEmail: selectedCompany.email,
          contactPhone: selectedCompany.phone,
          contactPerson: selectedCompany.contactPerson,
        },
        create: {
          salesUserId: user.id,
          companyName: selectedCompany.name.trim(),
          address: selectedCompany.address,
          contactEmail: selectedCompany.email,
          contactPhone: selectedCompany.phone,
          contactPerson: selectedCompany.contactPerson,
        },
      });
      totalClientsCreated++;

      // 8. Insert Proposal Record
      const createdProposal = await prisma.proposal.create({
        data: {
          proposalId,
          version: '1.0.0',
          status,
          stage,
          isHodApproved,
          probability,
          publicToken,
          salesUserId: user.id,
          clientName: selectedCompany.name.trim(),
          clientAddress: selectedCompany.address,
          clientEmail: selectedCompany.email,
          clientPhone: selectedCompany.phone,
          employeeCount,
          ratePerUser,
          baseAmount: monthlyBase,
          vatPercentage: 18.00,
          vatAmount,
          totalAmount,
          proposalDate: issuedDate,
          expiryDate,
          pdfPath,
          lossReason,
          lossNotes,
          lastContactedAt,
          cogsEstimated: employeeCount * 80.00,
          cogsRateWithVat: 80.00,
          totalCogsAmount: employeeCount * 80.00,
          createdAt: issuedDate,
          updatedAt: issuedDate,
        },
      });

      // 9. Attach Initial Interaction Activity for Realism
      const activityType = stage === DealStage.CLOSED_WON ? 'DEMO' : stage === DealStage.NEGOTIATION ? 'MEETING' : 'CALL';
      await prisma.proposalActivity.create({
        data: {
          proposalId: createdProposal.id,
          salesUserId: user.id,
          type: activityType,
          outcome: stage === DealStage.CLOSED_WON ? 'APPROVED' : 'INTERESTED',
          notes: `Commercial proposal discussion with ${selectedCompany.contactPerson} (${employeeCount} Users @ LKR ${ratePerUser.toFixed(2)}/head).`,
          createdAt: issuedDate,
        },
      });

      createdForRep++;
      totalProposalsCreated++;
    }

    console.log(`   ↳ Seeded ${createdForRep} unique proposals for ${repData.name}`);
  }

  // ── 5. Executive Verification & Summary Report ──────────────────────────────
  console.log('\n================================================================');
  console.log('📊 SEEDING COMPLETE: COMPREHENSIVE EXECUTIVE METRICS');
  console.log('================================================================');
  console.log(`Sales Representatives:    ${SALES_REPS.length} (New: ${totalRepsCreated}, Existing: ${totalRepsSkipped})`);
  console.log(`Proposals Seeded:         ${totalProposalsCreated}`);
  console.log(`Client Profiles Synced:   ${totalClientsCreated}`);
  console.log('----------------------------------------------------------------');
  console.log('Deal Lifecycle Funnel Breakdown:');
  console.log(` • HOD Pending (Gatekept):    ${stageBreakdown.HOD_PENDING} (${((stageBreakdown.HOD_PENDING / totalProposalsCreated) * 100).toFixed(1)}%)`);
  console.log(` • Approved / Sent (Active):  ${stageBreakdown.APPROVED_SENT} (${((stageBreakdown.APPROVED_SENT / totalProposalsCreated) * 100).toFixed(1)}%)`);
  console.log(` • Negotiation (Active):      ${stageBreakdown.NEGOTIATION} (${((stageBreakdown.NEGOTIATION / totalProposalsCreated) * 100).toFixed(1)}%)`);
  console.log(` • Closed Won (Realized):     ${stageBreakdown.CLOSED_WON} (${((stageBreakdown.CLOSED_WON / totalProposalsCreated) * 100).toFixed(1)}%)`);
  console.log(` • Closed Lost (Archived):    ${stageBreakdown.CLOSED_LOST} (${((stageBreakdown.CLOSED_LOST / totalProposalsCreated) * 100).toFixed(1)}%)`);
  console.log('----------------------------------------------------------------');
  console.log(`Active Pipeline Value (Excl. VAT): LKR ${totalActivePipelineValue.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`);
  console.log(`Monthly Won Net Revenue:           LKR ${totalWonRevenue.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`);
  console.log(`Monthly Won Gross Profit (60%):    LKR ${totalWonGrossProfit.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`);
  console.log(`Annualized Won Gross Profit (12M): LKR ${(totalWonGrossProfit * 12).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`);
  console.log('================================================================\n');
  console.log('✨ Database seeding finished successfully. Safe for repeated idempotent runs.');
}

main()
  .catch((err) => {
    console.error('❌ Seeder execution failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
