// FILE: client/src/utils/indiaData.js
// Complete list of Indian states and major cities

export const INDIA_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
];

export const CITIES_BY_STATE = {
  'Andhra Pradesh':     ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Tirupati', 'Rajahmundry', 'Kakinada'],
  'Arunachal Pradesh':  ['Itanagar', 'Naharlagun', 'Pasighat', 'Tezpur'],
  'Assam':              ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia'],
  'Bihar':              ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Bihar Sharif'],
  'Chhattisgarh':       ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon'],
  'Goa':                ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda'],
  'Gujarat':            ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Anand'],
  'Haryana':            ['Gurugram', 'Faridabad', 'Rohtak', 'Hisar', 'Panipat', 'Ambala', 'Karnal'],
  'Himachal Pradesh':   ['Shimla', 'Dharamshala', 'Solan', 'Mandi', 'Kullu', 'Manali'],
  'Jharkhand':          ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar', 'Hazaribagh'],
  'Karnataka':          ['Bengaluru', 'Mysuru', 'Hubli', 'Mangaluru', 'Belagavi', 'Kalaburagi', 'Davangere', 'Shivamogga'],
  'Kerala':             ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Kannur', 'Palakkad'],
  'Madhya Pradesh':     ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Ratlam'],
  'Maharashtra':        ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Solapur', 'Amravati', 'Kolhapur', 'Thane'],
  'Manipur':            ['Imphal', 'Thoubal', 'Bishnupur', 'Churachandpur'],
  'Meghalaya':          ['Shillong', 'Tura', 'Jowai', 'Nongstoin'],
  'Mizoram':            ['Aizawl', 'Lunglei', 'Saiha', 'Champhai'],
  'Nagaland':           ['Kohima', 'Dimapur', 'Mokokchung', 'Tuensang'],
  'Odisha':             ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri'],
  'Punjab':             ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Pathankot'],
  'Rajasthan':          ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Ajmer', 'Alwar'],
  'Sikkim':             ['Gangtok', 'Namchi', 'Mangan', 'Gyalshing'],
  'Tamil Nadu':         ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Vellore', 'Erode'],
  'Telangana':          ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Mahbubnagar', 'Nalgonda', 'Adilabad'],
  'Tripura':            ['Agartala', 'Udaipur', 'Dharmanagar', 'Kailashahar'],
  'Uttar Pradesh':      ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Prayagraj', 'Meerut', 'Ghaziabad', 'Noida', 'Bareilly'],
  'Uttarakhand':        ['Dehradun', 'Haridwar', 'Rishikesh', 'Nainital', 'Haldwani', 'Roorkee'],
  'West Bengal':        ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman', 'Malda'],
  'Delhi':              ['New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Dwarka', 'Rohini'],
  'Jammu & Kashmir':    ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Sopore'],
  'Ladakh':             ['Leh', 'Kargil'],
  'Puducherry':         ['Puducherry', 'Karaikal', 'Mahe', 'Yanam'],
  'Chandigarh':         ['Chandigarh'],
};

export const VEHICLE_TYPES = [
  { value: 'bike',           label: '🏍️ Bike',              desc: 'Small parcels, same city' },
  { value: 'auto',           label: '🛺 Auto Rickshaw',      desc: 'Medium parcels, city' },
  { value: 'van',            label: '🚐 Van',                desc: 'Large consignments' },
  { value: 'truck',          label: '🚛 Truck',              desc: 'Bulk transfers' },
  { value: 'cold_chain_van', label: '❄️ Cold Chain Van',     desc: 'Temperature sensitive drugs' },
];
