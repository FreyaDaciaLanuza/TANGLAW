/* Filipino (Tagalog) dictionary for TANGLAW.
   Keys are the English text exactly as it appears on screen (whitespace collapsed).
   FILX holds patterns for text that has numbers or names in it. */
window.FIL = {
  /* risk levels, time of day */
  'Low': 'Mababa', 'Medium': 'Katamtaman', 'High': 'Mataas',
  'Low (no tint)': 'Mababa (walang kulay)',
  'Late night': 'Hatinggabi', 'Before sunrise': 'Bago sumikat ang araw', 'Daytime': 'Umaga hanggang hapon',
  'Dusk': 'Takipsilim', 'Evening': 'Gabi',
  'Now': 'Ngayon', 'Before sunrise (4 AM)': 'Bago sumikat ang araw (4 AM)', 'Morning (8 AM)': 'Umaga (8 AM)',
  'Afternoon (2 PM)': 'Hapon (2 PM)', 'Evening (7 PM)': 'Gabi (7 PM)', 'Late night (11 PM)': 'Hatinggabi (11 PM)',
  'Risk by time of day': 'Antas ng panganib ayon sa oras', 'Pick your time': 'Piliin ang oras',
  'Why this rating': 'Bakit ganito ang rating',

  /* incident steps */
  'Reported': 'Naiulat', 'Report received': 'Natanggap ang ulat', 'Responder Route': 'Papunta ang Responder',
  'Responder is on the way': 'Papunta na ang responder', 'On-Site': 'Nasa Lugar', 'Responder has arrived': 'Dumating na ang responder',
  'Resolved': 'Naresolba', 'Incident closed': 'Sarado na ang insidente',

  /* facilities, categories, reasons */
  'Basketball court': 'Basketball court', 'Covered pavilion': 'Natatakpang pavilion', 'Playground': 'Palaruan', 'Open lawn': 'Bukas na damuhan',
  'Maintenance or repair': 'Maintenance o pagkukumpuni', 'Bad weather': 'Masamang panahon', 'Safety concern': 'Alalahanin sa kaligtasan',
  'Double-booked': 'Dobleng reserbasyon', 'Event at the park': 'May event sa parke', 'Other': 'Iba pa',
  'Broken streetlight': 'Sirang ilaw sa kalye', 'Pothole': 'Lubak', 'Flooded road': 'Baha sa kalsada', 'Damaged facility': 'Sirang pasilidad',
  'Poorly lit street': 'Madilim na kalye', 'Vacant lot': 'Bakanteng lote', 'Flood-prone road': 'Madalas bahaing kalsada',
  'Isolated footpath': 'Liblib na daanan', 'Alleyway': 'Eskinita', 'Ordinary street': 'Karaniwang kalye',

  /* navigation, roles */
  'Map': 'Mapa', 'Parks': 'Mga Parke', 'Contacts': 'Mga Contact', 'Settings': 'Mga Setting', 'Chat': 'Chat',
  'Requests': 'Mga Hiling', 'Schedule': 'Iskedyul', 'Manage': 'Pamahalaan', 'Back': 'Bumalik',
  'Citizen': 'Mamamayan', 'Barangay responder': 'Responder ng barangay', 'Park manager': 'Tagapamahala ng parke', 'Admin': 'Admin',
  'Citizens': 'Mga mamamayan', 'Responders': 'Mga responder', 'Park managers': 'Mga tagapamahala ng parke',

  /* GPS */
  'Locating…': 'Hinahanap ang lokasyon…', 'Location blocked. Allow it in browser settings.': 'Naka-block ang lokasyon. Payagan ito sa settings ng browser.',
  'GPS not supported': 'Hindi sinusuportahan ang GPS', 'Using demo location': 'Gamit ang demo na lokasyon',
  'GPS unavailable. Using a demo location.': 'Walang GPS. Gamit ang demo na lokasyon.',
  'Recenter map': 'Ibalik sa gitna ang mapa',
  'Map provider rejected the key or style. Showing the free map. Check MAP_API_KEY, MAP_STYLE and allowed domains.': 'Tinanggihan ng map provider ang key o style. Ipinapakita ang libreng mapa. Suriin ang MAP_API_KEY, MAP_STYLE at mga pinapayagang domain.',
  'Map could not load. Check your connection.': 'Hindi na-load ang mapa. Suriin ang koneksyon.',

  /* sign in */
  'Name (new accounts)': 'Pangalan (para sa bagong account)', 'Email': 'Email', 'Password': 'Password', 'I am a': 'Ako ay isang',
  'Access code': 'Access code', 'Admin code': 'Admin code', 'Park manager code': 'Code ng tagapamahala ng parke', 'Responder code': 'Code ng responder',
  'Log in': 'Mag-log in', 'Create account': 'Gumawa ng account', 'Log out': 'Mag-log out', 'Reset all data': 'I-reset ang lahat ng data',
  'By creating an account you allow barangay officials to see your live location while the app is open. It is never saved as a trail, and you can pause sharing in Settings.':
    'Sa paggawa ng account, pinapayagan mo ang mga opisyal ng barangay na makita ang iyong live na lokasyon habang bukas ang app. Hindi ito sine-save bilang trail, at maaari mong i-pause ang pagbabahagi sa Settings.',
  'Prototype: accounts are stored only on this device.': 'Prototype: ang mga account ay naka-save lamang sa device na ito.',
  'Enter your name and a password of at least 6 characters.': 'Ilagay ang iyong pangalan at password na hindi bababa sa 6 na character.',
  'Invalid access code for that role, or the server is unreachable.': 'Maling access code para sa tungkuling iyon, o hindi maabot ang server.',
  'Email or password does not match.': 'Hindi tugma ang email o password.',
  'No account on this device yet. Create one first.': 'Wala pang account sa device na ito. Gumawa muna.',
  'English': 'English', 'Filipino': 'Filipino',
  'Account suspended': 'Naka-suspinde ang account',
  'An administrator has suspended this account. You cannot reserve parks or report hazards right now. Please contact your barangay office.':
    'Sinuspinde ng isang administrator ang account na ito. Hindi ka muna makakapagreserba ng parke o makapag-uulat ng panganib. Makipag-ugnayan sa inyong barangay office.',
  'Your account is suspended. Contact your barangay office.': 'Naka-suspinde ang iyong account. Makipag-ugnayan sa inyong barangay office.',

  /* citizen home, SOS */
  'You': 'Ikaw', 'Close contacts': 'Malalapit na contact', 'Report hazard': 'Mag-ulat ng panganib', 'Emergency': 'Emergency',
  'Report emergency': 'Mag-ulat ng emergency', 'Tap to send': 'Pindutin para ipadala', 'SOS': 'SOS',
  'Add a note (optional)': 'Magdagdag ng tala (opsyonal)', 'TANGLAW does not replace 911.': 'Hindi pinapalitan ng TANGLAW ang 911.',
  'Call 911': 'Tawagan ang 911', 'for life-threatening emergencies.': 'para sa mga emergency na nanganganib ang buhay.',
  'Incident status': 'Katayuan ng insidente', 'No active incident.': 'Walang aktibong insidente.', 'Assigned responder': 'Nakatalagang responder',
  'GPS pin': 'GPS pin', 'Close incident': 'Isara ang insidente', 'Emergency report': 'Ulat ng emergency',
  'Another responder already took this incident.': 'May ibang responder nang kumuha ng insidenteng ito.',
  'Crowded': 'Masikip', 'Busy': 'Maraming tao', 'Quiet': 'Tahimik',
  'Pin': 'Pin', 'Park': 'Parke', '(pending review)': '(naghihintay ng pagsusuri)',
  '· riskier after dark': '· mas mapanganib kapag gabi',
  'Nobody is online with location sharing on.': 'Walang naka-online na nagbabahagi ng lokasyon.',
  '· Responder': '· Responder', '· Park manager': '· Tagapamahala ng parke', '· Admin': '· Admin',
  'A crowd or responder nearby is lowering the risk here.': 'Ang maraming tao o responder sa paligid ay nagpapababa ng panganib dito.',

  /* risk explanation */
  'Hazard reports nearby': 'Mga ulat ng panganib sa paligid', 'Known risk areas': 'Mga kilalang delikadong lugar', 'Area type': 'Uri ng lugar',
  'Recent incidents': 'Mga kamakailang insidente', 'Crowd nearby (adds safety)': 'Maraming tao sa paligid (dagdag-kaligtasan)',
  'Responder nearby (adds safety)': 'Responder sa paligid (dagdag-kaligtasan)',
  'Police, hospital or barangay hall nearby (adds safety)': 'Pulis, ospital o barangay hall sa paligid (dagdag-kaligtasan)',
  'Street lighting after dark': 'Ilaw sa kalye pagkagabi', 'Nearest emergency service': 'Pinakamalapit na serbisyong pang-emergency',
  'None nearby': 'Wala sa paligid', 'People within 100 m': 'Mga tao sa loob ng 100 m', 'Nearest on-duty responder': 'Pinakamalapit na responder na naka-duty',
  'Time of day': 'Oras ng araw', 'Hazard reports within 150 m': 'Mga ulat ng panganib sa loob ng 150 m',
  'Medium risk': 'Katamtamang panganib', 'High risk': 'Mataas na panganib', 'Low risk': 'Mababang panganib',

  /* reservations */
  'Reserve': 'Magreserba', 'Reserved': 'Nakareserba', 'My requests': 'Aking mga hiling', 'Pending': 'Nakabinbin',
  'Pending approval': 'Naghihintay ng pag-apruba', 'Pending review': 'Naghihintay ng pagsusuri', 'Approved': 'Naaprubahan', 'Rejected': 'Tinanggihan',
  'Cancelled': 'Kanselado', 'Cancel': 'Kanselahin', 'Available': 'Available', 'Not available': 'Hindi available',
  'Reservation requests': 'Mga hiling na reserbasyon', 'No pending requests for your parks.': 'Walang nakabinbing hiling para sa iyong mga parke.',
  'Approved reservations': 'Mga naaprubahang reserbasyon', 'Cancel reservation': 'Kanselahin ang reserbasyon',
  'No upcoming approved reservations.': 'Walang paparating na naaprubahang reserbasyon.', 'Recently cancelled': 'Kamakailang kinansela',
  'You only see requests for parks you added. Open the Schedule tab to see what is booked for a facility. Reservations are also cancelled automatically when a park is closed, or an incident near it stays unresolved for more than 30 minutes.':
    'Makikita mo lamang ang mga hiling para sa mga parkeng idinagdag mo. Buksan ang tab na Iskedyul para makita ang mga naka-book sa isang pasilidad. Awtomatiko ring makakansela ang mga reserbasyon kapag sarado ang parke, o kapag hindi pa naaayos nang higit 30 minuto ang insidente malapit dito.',
  'Cancel reservation?': 'Kanselahin ang reserbasyon?', 'Keep reservation': 'Ituloy ang reserbasyon', 'Reason': 'Dahilan',
  'Choose a reason': 'Pumili ng dahilan', 'Reason (required)': 'Dahilan (kailangan)', 'Note to the citizen (optional)': 'Tala para sa mamamayan (opsyonal)',
  'Reason (optional)': 'Dahilan (opsyonal)', 'Why are you cancelling?': 'Bakit mo kinakansela?',
  'Choose a reason.': 'Pumili ng dahilan.', 'Tell the citizen why you are cancelling.': 'Sabihin sa mamamayan kung bakit mo kinakansela.',
  'Could not cancel. It may already be cancelled or over.': 'Hindi makansela. Maaaring kanselado na ito o tapos na.',
  'Reservation cancelled.': 'Nakansela ang reserbasyon.', 'Marked approved.': 'Namarkahang naaprubahan.', 'Marked rejected.': 'Namarkahang tinanggihan.',
  'Facility schedule': 'Iskedyul ng pasilidad', 'Facility': 'Pasilidad', 'Date': 'Petsa', 'Start time': 'Oras ng simula', 'End time': 'Oras ng tapos',
  'Purpose': 'Layunin', 'Request reservation': 'Humiling ng reserbasyon', 'All parks': 'Lahat ng parke',
  'Choose a date, start time and end time.': 'Pumili ng petsa, oras ng simula at oras ng tapos.',
  'Check your time': 'Suriin ang oras', 'The end time must be after the start time.': 'Dapat mas huli ang oras ng tapos kaysa sa simula.',
  'Too short': 'Masyadong maikli', 'The minimum booking is 30 minutes.': 'Ang pinakamaikling reserbasyon ay 30 minuto.',
  'Outside park hours': 'Labas sa oras ng parke', 'Time has passed': 'Lumipas na ang oras', 'Park closed': 'Sarado ang parke',
  'Overlaps': 'Nagsasapawan', 'Open windows:': 'Mga bukas na oras:', 'See everything reserved': 'Tingnan ang lahat ng naka-reserba',
  'Choose a date to see availability.': 'Pumili ng petsa para makita ang availability.',
  'Tap a park on the map, or pick it below, to see what is open there.': 'Pumili ng parke sa mapa, o sa ibaba, para makita kung ano ang bukas doon.',
  'No parks are open for reservation yet. A park shows up here as soon as a park manager adds it on their map.': 'Wala pang parkeng bukas para sa reserbasyon. Lalabas dito ang parke kapag idinagdag ito ng tagapamahala sa kanilang mapa.',
  'Nothing is reserved yet. Open times show on the Reserve tab.': 'Wala pang naka-reserba. Makikita ang mga bukas na oras sa tab na Magreserba.',
  'Pending means a park manager has not decided yet. Those times can still be requested by someone else until approved.': 'Ang Nakabinbin ay nangangahulugang wala pang desisyon ang tagapamahala. Maaari pang hilingin ng iba ang mga oras na iyon hanggang maaprubahan.',
  'No requests yet. Use the Reserve tab to book a facility.': 'Wala pang hiling. Gamitin ang tab na Magreserba para mag-book ng pasilidad.',
  'The manager of that park reviews each request.': 'Sinusuri ng tagapamahala ng parke ang bawat hiling.',
  'Choose a park first.': 'Pumili muna ng parke.', 'This park is temporarily closed today. Pick another day.': 'Pansamantalang sarado ang parke ngayon. Pumili ng ibang araw.',
  'Someone just took that time. Pick another window.': 'May kumuha na sa oras na iyon. Pumili ng ibang oras.',
  'Could not send. Check your connection and try again.': 'Hindi naipadala. Suriin ang koneksyon at subukan muli.',
  'Could not send. Check your connection.': 'Hindi naipadala. Suriin ang koneksyon.',
  'Request sent. The park manager will review it.': 'Naipadala ang hiling. Susuriin ito ng tagapamahala ng parke.',
  'Could not update. Check your connection.': 'Hindi ma-update. Suriin ang koneksyon.',

  /* manager */
  'Other managers': 'Iba pang tagapamahala', 'Hazard': 'Panganib', 'Report a hazard near a park': 'Mag-ulat ng panganib malapit sa parke',
  'Hazards near your parks': 'Mga panganib malapit sa iyong mga parke', 'Park managers online': 'Mga tagapamahalang naka-online', 'Your parks': 'Iyong mga parke',
  'Park name': 'Pangalan ng parke', 'Area to watch': 'Lugar na babantayan', '100 m around the pin': '100 m sa paligid ng pin', '200 m around the pin': '200 m sa paligid ng pin',
  '300 m around the pin': '300 m sa paligid ng pin', '500 m around the pin': '500 m sa paligid ng pin', 'Add park at the pin': 'Idagdag ang parke sa pin',
  'Tap the map to drop a pin. Without a pin, your GPS location is used. Hazards within the area plus 250 m show up in your list. Every park you add here becomes available for citizens to reserve.':
    'Pindutin ang mapa para maglagay ng pin. Kung walang pin, gagamitin ang iyong GPS. Lalabas sa listahan mo ang mga panganib sa loob ng lugar at 250 m pa. Ang bawat parkeng idadagdag mo rito ay mabubuksan para sa reserbasyon ng mga mamamayan.',
  'Add a park below to see hazards around it.': 'Magdagdag ng parke sa ibaba para makita ang mga panganib sa paligid nito.',
  'No reported hazards near your parks.': 'Walang naiulat na panganib malapit sa iyong mga parke.',
  'No other park managers are online with location sharing on.': 'Walang ibang tagapamahalang naka-online na nagbabahagi ng lokasyon.',
  'No parks yet. Add one below so hazards around it show up here.': 'Wala pang parke. Magdagdag sa ibaba para lumabas dito ang mga panganib sa paligid nito.',
  'You have no parks yet. Add one on the Map tab and it appears here and in the citizens’ Parks tab.': 'Wala ka pang parke. Magdagdag sa tab na Mapa at lalabas ito rito at sa tab na Mga Parke ng mga mamamayan.',
  'Tap the map to drop a pin, or turn on GPS.': 'Pindutin ang mapa para maglagay ng pin, o i-on ang GPS.',
  'Could not save. Check your connection and try again.': 'Hindi na-save. Suriin ang koneksyon at subukan muli.',
  'Park added. Hazards near it will show up in your list.': 'Naidagdag ang parke. Lalabas sa listahan mo ang mga panganib malapit dito.',
  'Remove': 'Alisin', 'Show': 'Ipakita', 'Message': 'Mensahe', 'Show on map': 'Ipakita sa mapa', 'Navigate': 'Magpunta rito',
  'Close': 'Isara', 'Reopen': 'Buksang muli', 'Temporarily closed': 'Pansamantalang sarado', 'Closed by the park manager': 'Isinara ng tagapamahala ng parke',
  'Park marked temporarily closed. Today’s remaining reservations there were cancelled.': 'Minarkahang pansamantalang sarado ang parke. Nakansela ang natitirang reserbasyon ngayon doon.',
  'Park reopened.': 'Muling nabuksan ang parke.', 'Approve': 'Aprubahan', 'Reject': 'Tanggihan', 'Mark fixed': 'Markahang naayos',
  'Approved. The area’s risk level is updated.': 'Naaprubahan. Na-update ang antas ng panganib ng lugar.',
  'Marked fixed. The area’s risk level recovers.': 'Namarkahang naayos. Bumababa na ang antas ng panganib ng lugar.',
  'Foot traffic': 'Dami ng bisita', 'Visitors today': 'Mga bisita ngayon', 'Last 7 days': 'Nakaraang 7 araw', 'Busiest hour today': 'Pinakamaraming tao ngayon',
  '6 AM': '6 AM', '10 AM': '10 AM', '2 PM': '2 PM', '6 PM': '6 PM', '10 PM': '10 PM',
  'Counts of app users who were inside the park area, per hour. Only counts are kept, never names or trails.': 'Bilang ng mga gumagamit ng app na nasa loob ng parke, bawat oras. Bilang lamang ang itinatago, hindi ang pangalan o trail.',

  /* chat */
  'Staff chat': 'Chat ng mga kawani', 'Responders chat': 'Chat ng mga responder', 'Park managers chat': 'Chat ng mga tagapamahala ng parke',
  'Send': 'Ipadala', 'Message responders': 'Mensahe sa mga responder', 'Message park managers': 'Mensahe sa mga tagapamahala ng parke',
  'No messages yet.': 'Wala pang mensahe.', 'Everyone': 'Lahat', 'Alert from': 'Alerto mula kay',

  /* responder hub */
  'Incidents': 'Mga insidente', 'Hazards': 'Mga panganib', 'Team': 'Koponan', 'To review (': 'Susuriin (', 'Active hazards (': 'Mga aktibong panganib (',
  'No active incidents.': 'Walang aktibong insidente.', 'Nothing to review.': 'Walang susuriin.', 'No active hazards.': 'Walang aktibong panganib.',
  'Reported hazards raise the risk level around them (half weight until approved) until marked fixed.': 'Ang mga naiulat na panganib ay nagpapataas ng antas ng panganib sa paligid nila (kalahati ang bigat hanggang maaprubahan) hanggang maitalang naayos.',
  'On duty ·': 'Naka-duty ·', 'No other responders are on duty with a live location right now.': 'Walang ibang responder na naka-duty na may live na lokasyon ngayon.',
  'Responders who are timed in appear on the map with their name. Use Chat to reach them and the admin.': 'Lumalabas sa mapa ang pangalan ng mga responder na naka-time in. Gamitin ang Chat para makausap sila at ang admin.',
  'Time in': 'Mag-time in', 'Time out': 'Mag-time out', 'Time in to share your location and receive incident routing. Time out when your shift ends.': 'Mag-time in para ibahagi ang lokasyon at makatanggap ng mga insidente. Mag-time out kapag tapos na ang shift.',
  'Enter your account password to': 'Ilagay ang password ng iyong account para', 'your shift.': 'sa iyong shift.',
  'Wrong password. Your shift was not changed.': 'Maling password. Hindi nabago ang iyong shift.',
  'Could not record this. Check your connection and try again.': 'Hindi naitala. Suriin ang koneksyon at subukan muli.',
  'Timed in at': 'Nag-time in noong', 'Timed out at': 'Nag-time out noong', 'on shift.': 'sa shift.',
  'Time out before you log out, so your shift is recorded.': 'Mag-time out bago mag-log out para maitala ang iyong shift.',
  'Acknowledge': 'Kinikilala', 'Add': 'Idagdag',

  /* admin overview */
  'Citizens online': 'Mga mamamayang online', 'Responders online': 'Mga responder na online', 'Active incidents': 'Mga aktibong insidente',
  'Hazards to review': 'Mga panganib na susuriin', 'Pending requests': 'Mga nakabinbing hiling', 'People': 'Mga tao', 'Responder time log': 'Talaan ng oras ng mga responder',
  'Only people who are online with location sharing on appear on the map. Nothing is stored as a trail.': 'Ang mga online lamang na nagbabahagi ng lokasyon ang lumalabas sa mapa. Walang itinatagong trail.',
  'No responder has timed in yet.': 'Wala pang responder na nag-time in.', 'In': 'Pasok',

  /* hazard report */
  'Report a hazard': 'Mag-ulat ng panganib', 'Tap the map to place the pin. Default is your GPS location.': 'Pindutin ang mapa para ilagay ang pin. Ang default ay ang iyong GPS.',
  'Photo': 'Larawan', 'Category': 'Kategorya', 'Describe the hazard': 'Ilarawan ang panganib', 'Submit for review': 'Ipasa para suriin', 'Your reports': 'Iyong mga ulat',
  'No reports yet.': 'Wala pang ulat.',
  'Your report raises the risk level of that area right away. A responder, park manager or admin then verifies it, and the area recovers once it is fixed.': 'Agad na tumataas ang antas ng panganib ng lugar dahil sa iyong ulat. Pagkatapos, bibeberipikahin ito ng responder, tagapamahala ng parke o admin, at babalik sa normal ang lugar kapag naayos na.',
  'Submitted. It already raises the risk level there. A responder, park manager or admin will verify it.': 'Naipasa. Tumataas na ang antas ng panganib doon. Bibeberipikahin ito ng responder, tagapamahala ng parke o admin.',

  /* contacts, link, check-in */
  'Emergency contacts': 'Mga emergency contact', 'Add a contact': 'Magdagdag ng contact', 'Search by name': 'Maghanap ayon sa pangalan',
  'They must have a TANGLAW account and accept your request. Once they do, they receive your alerts and you can see each other on the map while you are both online and sharing location.': 'Kailangan nilang may TANGLAW account at tanggapin ang iyong hiling. Kapag nagawa nila, matatanggap nila ang iyong mga alerto at makikita ninyo ang isa’t isa sa mapa habang pareho kayong online at nagbabahagi ng lokasyon.',
  'Preview what a contact receives': 'Silipin ang natatanggap ng contact', 'Secure expiring link': 'Ligtas na link na mawawalan ng bisa', 'Loading…': 'Naglo-load…',
  'Alerts for you': 'Mga alerto para sa iyo', 'Requests for you': 'Mga hiling para sa iyo', 'Accept': 'Tanggapin', 'Decline': 'Tanggihan',
  'Your contacts': 'Iyong mga contact', 'Ask again': 'Magtanong muli', 'Consent accepted': 'Pumayag na', 'Declined': 'Tinanggihan', 'Consent pending': 'Naghihintay ng pagpayag',
  'No contacts yet. Search a name below to add someone to alert if you miss a check-in.': 'Wala pang contact. Maghanap ng pangalan sa ibaba para magdagdag ng aalertuhan kapag hindi ka nakasagot sa check-in.',
  'You are a contact for': 'Ikaw ay contact ni', 'Accepted': 'Tinanggap', 'Requested': 'Hiniling',
  'Could not search. Check your connection.': 'Hindi makapaghanap. Suriin ang koneksyon.', 'No one found. They need to create a TANGLAW account first.': 'Walang nahanap. Kailangan muna nilang gumawa ng TANGLAW account.',
  'Request sent. They must accept before they can receive alerts.': 'Naipadala ang hiling. Kailangan nila itong tanggapin bago sila makatanggap ng alerto.',
  'You already added this person.': 'Naidagdag mo na ang taong ito.', 'That person is no longer in the directory. Ask them to open TANGLAW again.': 'Wala na ang taong iyon sa direktoryo. Hilingin sa kanilang buksang muli ang TANGLAW.',
  'You will receive their alerts.': 'Matatanggap mo ang kanilang mga alerto.', 'Request declined.': 'Tinanggihan ang hiling.',
  'may need help. Open Contacts to see their location.': 'ay maaaring nangangailangan ng tulong. Buksan ang Mga Contact para makita ang kanilang lokasyon.',
  'This link has expired': 'Nawalan na ng bisa ang link na ito', 'Ask the sender to share their location again.': 'Hilingin sa nagpadala na ibahagi muli ang kanilang lokasyon.',
  'Are you okay?': 'Ayos ka lang ba?', 'You have stayed in a High Risk zone.': 'Matagal ka nang nasa lugar na Mataas ang panganib.', 'I’m OK': 'Ayos lang ako',
  'Contacts are alerted if no reply in': 'Aalertuhan ang mga contact kung walang sagot sa loob ng', 'Private, one-tap dismiss': 'Pribado, isang pindot lang para isara',
  'Alert sent to': 'Naipadala ang alerto kay', 'with an expiring location link.': 'kasama ang link ng lokasyon na mawawalan ng bisa.',
  'No connection. Your alert will be sent automatically as soon as you are back online. You can also call your contacts or 911.': 'Walang koneksyon. Awtomatikong ipapadala ang iyong alerto pagbalik mo online. Maaari mo ring tawagan ang iyong mga contact o ang 911.',
  'No contact has accepted yet, so no alert was sent. Add contacts in Contacts.': 'Wala pang contact na pumayag kaya walang naipadalang alerto. Magdagdag ng contact sa Mga Contact.',
  'Alert sent.': 'Naipadala ang alerto.', 'Alert sent to your contacts.': 'Naipadala ang alerto sa iyong mga contact.',
  'Unanswered check-in': 'Check-in na hindi nasagot', 'Link expires in': 'Mawawalan ng bisa ang link sa loob ng', 'ID': 'ID',
  '’s live location': ' — live na lokasyon', '· updated': '· na-update',

  /* settings */
  'Language / Wika': 'Language / Wika', 'Check-in prompt after staying in a High Risk zone': 'Check-in prompt matapos manatili sa lugar na Mataas ang panganib',
  'Saved.': 'Nai-save.', 'Share my live location with barangay officials': 'Ibahagi ang aking live na lokasyon sa mga opisyal ng barangay',
  'Only while the app is open. Not saved as a trail. Also counts anonymously toward crowd levels.': 'Habang bukas lang ang app. Hindi sine-save bilang trail. Kasama rin ito nang walang pangalan sa bilang ng dami ng tao.',
  ' Other park managers see you on their map.': ' Makikita ka ng ibang tagapamahala ng parke sa kanilang mapa.',
  ' Contacts who accepted you see you on their map.': ' Makikita ka ng mga contact na pumayag sa kanilang mapa.',
  'Demo mode': 'Demo mode', 'Check-in after 10 s instead of your chosen time. Links expire after 1 min.': 'Check-in pagkalipas ng 10 s sa halip na ang napili mong oras. Mawawalan ng bisa ang mga link pagkalipas ng 1 min.',
  'Simulate High Risk at my location': 'I-simulate ang Mataas na panganib sa aking lokasyon', 'Lets you test the check-in without walking anywhere.': 'Para masubukan ang check-in nang hindi kailangang maglakad.',
  'Simulate a crowd at my location': 'I-simulate ang maraming tao sa aking lokasyon', 'Adds about 10 people here. A crowd makes the area safer.': 'Nagdaragdag ng mga 10 tao rito. Mas ligtas ang lugar kapag maraming tao.',
  'Simulate a responder nearby': 'I-simulate ang responder sa malapit', 'Adds an on-duty responder about 55 m away. Together with a crowd the effect is stronger.': 'Nagdaragdag ng naka-duty na responder na mga 55 m ang layo. Mas malakas ang epekto kasama ng maraming tao.',
  'Show simulated risk areas': 'Ipakita ang mga simulated na delikadong lugar',
  'Prototype data: random alleyways, poorly lit streets and similar spots that raise the risk level. Everywhere else stays Low.': 'Prototype na data: mga eskinita, madidilim na kalye at katulad na lugar na nagpapataas ng panganib. Mababa ang panganib sa lahat ng iba pa.',
  'Reshuffle simulated areas': 'Ihalo muli ang mga simulated na lugar', 'Simulated risk areas reshuffled.': 'Naihalo muli ang mga simulated na delikadong lugar.',
  'Location is used only while the app is open and is not saved as a trail.': 'Ginagamit lamang ang lokasyon habang bukas ang app at hindi sine-save bilang trail.',

  /* admin console */
  'Users': 'Mga user', 'Incident reports': 'Mga ulat ng insidente', 'Reservations': 'Mga reserbasyon', 'Maintenance reports': 'Mga ulat sa maintenance',
  'Parks and safety places': 'Mga parke at ligtas na lugar', 'Accounts: view, suspend or reactivate': 'Mga account: tingnan, suspindihin o muling buhayin',
  'Citizens registered on this server. A suspended user cannot reserve parks or report hazards and sees a notice in the app. Emergency calling stays available.': 'Mga mamamayang nakarehistro sa server na ito. Ang naka-suspindeng user ay hindi makapagreserba ng parke o makapag-uulat ng panganib at makakakita ng abiso sa app. Magagamit pa rin ang pagtawag sa emergency.',
  'Online now': 'Online ngayon', 'Offline': 'Offline', 'Suspended': 'Naka-suspinde', 'Suspend': 'Suspindihin', 'Reactivate': 'Muling buhayin',
  'No registered users yet.': 'Wala pang nakarehistrong user.', 'Account suspended.': 'Sinuspinde ang account.', 'Account reactivated.': 'Muling binuhay ang account.',
  'Active': 'Aktibo', 'All': 'Lahat', 'Mark resolved': 'Markahang naresolba', 'Delete': 'Burahin', 'Deleted.': 'Nabura.',
  'Delete this record permanently?': 'Burahin nang tuluyan ang talang ito?', 'Incident marked resolved.': 'Namarkahang naresolba ang insidente.',
  'No incidents here.': 'Walang insidente rito.', 'Nothing here.': 'Walang laman dito.', 'Upcoming': 'Paparating', 'Past or cancelled': 'Nakalipas o kanselado',
  'To review': 'Susuriin', 'Fixed': 'Naayos',
  'No parks yet.': 'Wala pang parke.', 'Safety places': 'Mga ligtas na lugar', 'No safety places yet.': 'Wala pang ligtas na lugar.',
  'Police stations, hospitals and barangay halls lower the risk around them. Well-lit areas cancel the small extra risk after dark.': 'Ang mga istasyon ng pulis, ospital at barangay hall ay nagpapababa ng panganib sa paligid nila. Inaalis ng mga maliwanag na lugar ang maliit na dagdag na panganib pagkagabi.',
  'Add a safety place': 'Magdagdag ng ligtas na lugar', 'Name': 'Pangalan', 'Type': 'Uri', 'Latitude': 'Latitude', 'Longitude': 'Longitude',
  'Use my current location': 'Gamitin ang aking kasalukuyang lokasyon', 'Add place': 'Idagdag ang lugar', 'Place added.': 'Naidagdag ang lugar.', 'Place removed.': 'Naalis ang lugar.',
  'Enter valid coordinates.': 'Maglagay ng wastong coordinates.', 'Location is not available yet.': 'Wala pang magamit na lokasyon.',
  'Police station': 'Istasyon ng pulis', 'Hospital': 'Ospital', 'Barangay hall': 'Barangay hall', 'Well-lit area': 'Maliwanag na lugar',
  'Park manager:': 'Tagapamahala ng parke:',


  /* leftovers */
  'Today': 'Ngayon', 'Your time': 'Iyong oras', 'Try instead:': 'Subukan na lang:', '✕ Not available': '✕ Hindi available',
  'Off duty': 'Hindi naka-duty', 'On duty': 'Naka-duty',
  'Visible to all park managers and the admin.': 'Nakikita ng lahat ng tagapamahala ng parke at ng admin.',
  'No messages yet. Say hi to the team.': 'Wala pang mensahe. Bumati sa koponan.',
  'Type at least 2 letters': 'Mag-type ng hindi bababa sa 2 letra',
  'Message park managers and admin': 'Mensahe sa mga tagapamahala ng parke at admin',
  'Only while the app is open. Not saved as a trail. Also counts anonymously toward crowd levels. Contacts who accepted you see you on their map.':
    'Habang bukas lang ang app. Hindi sine-save bilang trail. Kasama rin ito nang walang pangalan sa bilang ng dami ng tao. Makikita ka ng mga contact na pumayag sa kanilang mapa.',
  'Only while the app is open. Not saved as a trail. Also counts anonymously toward crowd levels. Other park managers see you on their map.':
    'Habang bukas lang ang app. Hindi sine-save bilang trail. Kasama rin ito nang walang pangalan sa bilang ng dami ng tao. Makikita ka ng ibang tagapamahala ng parke sa kanilang mapa.',

  /* misc */
  'just now': 'ngayon lang', 'Incident update:': 'Update sa insidente:',
  'm from': 'm mula sa', 'km away': 'km ang layo'
};

(function () {
  const F = window.FIL, t = s => F[s] || s, lc = s => t(s.charAt(0).toUpperCase() + s.slice(1)).toLowerCase();
  window.FILX = [
    [/^(.*) \((\d+)\)$/,                 (l, n) => `${t(l)} (${n})`],
    [/^(Responder|Admin): (.*)$/,           (r, n) => `${t(r)}: ${n}`],
    [/^(\d+) · (Crowded|Busy|Quiet)$/,      (n, c) => `${n} · ${t(c)}`],
    [/^(.*) · raises risk$/,                x => `${t(x)} · nagpapataas ng panganib`],
    [/^(.*) · yours$/,                      x => `${x} · sa iyo`],
    [/^Overlaps (.*), which is (already reserved|pending approval)\.$/, (r, w) => `Nagsasapawan sa ${r}, na ${w == 'pending approval' ? 'naghihintay ng pag-apruba' : 'naka-reserba na'}.`],
    [/^A check-in prompt appears after (\d+) ?s in a High Risk zone\.$/, a => `Lalabas ang check-in pagkalipas ng ${a} s sa lugar na Mataas ang panganib.`],
    [/^In a High Risk zone for (\d+) ?s\. Check-in prompt at (\d+) ?s\.$/, (a, b) => `${a} s nang nasa lugar na Mataas ang panganib. Lalabas ang check-in sa ${b} s.`],
    [/^In (.*) so far$/,                    x => `Pasok ${x} sa ngayon`],
    [/^(\d+) min ago$/,                     n => `${n} min ang nakalipas`],
    [/^(\d+) minutes$/,                     n => `${n} minuto`],
    [/^(\d+) active$/,                      n => `${n} aktibo`],
    [/^(\d+) pending$/,                     n => `${n} nakabinbin`],
    [/^(\d+) to review$/,                   n => `${n} susuriin`],
    [/^(\d+) parks · (\d+) places$/,        (p, s) => `${p} parke · ${s} lugar`],
    [/^Park manager: (.*)$/,                n => `Tagapamahala ng parke: ${n}`],
    [/^(Citizen|Barangay responder|Park manager|Admin) · (.*)$/, (r, e) => `${t(r)} · ${e}`],
    [/^(Low|Medium|High) risk$/,            l => `${t(l)} na panganib`.replace('Mababa na', 'Mababang').replace('Katamtaman na', 'Katamtamang').replace('Mataas na na', 'Mataas na')],
    [/^, safety (.*)$/,                     x => `, kaligtasan ${x}`],
    [/^Current zone:$/,                     () => 'Kasalukuyang lugar:'],
    [/^\(preview: (.*)\)$/,                 x => `(preview: ${t(x)})`],
    [/^Known risk area nearby: (.*)\.$/,    k => `Kilalang delikadong lugar sa malapit: ${lc(k)}.`],
    [/^GPS live, ±(.*)$/,                   x => `Live ang GPS, ±${x}`],
    [/^Reservation approved: (.*)$/,        x => `Naaprubahan ang reserbasyon: ${x}`],
    [/^Reservation declined: (.*)$/,        x => `Tinanggihan ang reserbasyon: ${x}`],
    [/^Reservation cancelled: (.*)$/,       x => `Nakansela ang reserbasyon: ${x}`],
    [/^Cancelled (automatically|by the park manager|by an administrator|by you)(.*)$/, (w, r) =>
        `Kinansela ${{ 'automatically': 'nang awtomatiko', 'by the park manager': 'ng tagapamahala ng parke', 'by an administrator': 'ng administrator', 'by you': 'mo' }[w]}${r.replace(/^: (Park temporarily closed|Incident near the park)/, (_, y) => ': ' + (y[0] == 'P' ? 'Pansamantalang sarado ang parke' : 'May insidente malapit sa parke'))}`],
    [/^(.*) · (Police station|Hospital|Barangay hall|Well-lit area)$/, (n, k) => `${n} · ${t(k)}`],
    [/^(Marked|Alert|Booked by) (.*)$/,     (w, x) => w == 'Booked by' ? `Ni-book ni ${x}` : `${t(w)} ${x}`],
    [/^Booked by (.*)$/,                    x => `Ni-book ni ${x}`],
    [/^In a High Risk zone for (\d+)s\. Check-in prompt at (\d+)s\.$/, (a, b) => `${a}s nang nasa lugar na Mataas ang panganib. Lalabas ang check-in sa ${b}s.`],
    [/^A check-in prompt appears after (\d+)s in a High Risk zone\.$/, a => `Lalabas ang check-in pagkalipas ng ${a}s sa lugar na Mataas ang panganib.`]
  ];
})();
