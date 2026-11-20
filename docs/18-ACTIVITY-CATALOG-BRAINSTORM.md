# Apartment activity catalog

Revision of 2026-11-20. In each station table the player selects the named friend, taps that station on the existing map, then chooses the Persian option. A slash between choices denotes alternatives. Timings in ticks are local implementation defaults at ten ticks per simulated second. Pausing the game pauses these timers. “Design” describes the intended visible outcome for candidates still missing.

**CONFIRMED** covers the owner's specified interactions and character traits. **IMPLEMENTATION DEFAULT** covers playable choices and pacing that can change. **PROPOSAL** needs owner review before a new rule, unlock or menu is shipped. **OPEN** means a specific dependency still needs a decision. A liked concept is recorded separately from approval of its mechanics. No candidate implies an inventory, skill tree or new room.

## خوراکی · Food

| Choice ID and label | Who and prerequisites | Action, duration and output | Status, effort and replay value |
|---|---|---|---|
| jelly_prepare · تهیه ژله | Parsa alone, jelly request and counter | Walk, mix 24 ticks, carry bowl to fridge | CONFIRMED, implemented; medium. Starts the two-command journey. |
| jelly_store · گذاشتن ژله در یخچال | Parsa, prepared bowl | Carry then store for 8 ticks; cool for 55. Recover interrupted carry at food popup. | CONFIRMED, implemented; medium. Creates persistent delayed output. |
| jelly_eat · خوردن ژله | Parsa, ready fridge | Second command retrieves and eats for 20 ticks, closes original request | CONFIRMED, implemented; medium. One terminal reward opportunity. |
| snack · برداشتن خوراکی | Anyone, especially Parham and Barbod; fridge | 25 ticks, eat and leave dishes and clutter | IMPLEMENTATION DEFAULT, implemented; small. Feeds cleaning loop. |
| food.inspect · نگاه به یخچال | Anyone alone; fridge contents decision | Open door, inspect briefly, complain if empty, ask for food | Liked concept; PROPOSAL for contents and timing, small. Seeds requests. |
| food.sweet · خوردن شیرینی | Anyone, preferred by Barbod; sweet available | Select from fridge; happy bite, dirty plate | CONFIRMED preference, PROPOSAL item; small. Character variation. |
| food.drink · نوشیدنی | Anyone alone; drinks/menu open | Pick cup, drink briefly, leave glass | PROPOSAL, small. Meal variety. |
| food.meal · آماده کردن غذا | Anyone; counter and approved meal | Prepare, serve, eat; vary popup by simulated mealtime | OPEN menu, medium. Day-cycle variety. |
| food.share · تعارف کردن | Two free friends, one serving | Offer then accept and eat; finish after both arrive | PROPOSAL, medium. Reuses pair reservations. |
| event.snack_thief · خوراکی گم شده | Pair, unattended serving | Reach for food, owner reacts, settle once | Liked concept; PROPOSAL trigger, medium. Social interruption. |

## نظافت · Cleaning

| Choice ID and label | Who and prerequisites | Action, duration and output | Status, effort and replay value |
|---|---|---|---|
| dishes · شستن ظرف‌ها | Anyone, weighted toward Kavian; dirty dish and sink | Wash 55 ticks, one fewer dish | CONFIRMED, implemented; small. Repeat after meals. |
| clean · تمیز کردن پیشخوان | Anyone, especially Kavian; messy counter | Wipe for 45 ticks, remove clutter | IMPLEMENTATION DEFAULT, implemented; small. Restores kitchen. |
| cleaning.sweep · جارو کردن | One, floor and broom | Follow a short floor route, remove debris | PROPOSAL, medium. Visible room difference; needs debris art. |
| cleaning.mop · تی کشیدن | One, spill and mop | Clean until spill disappears; release floor on cancel | PROPOSAL, medium. Respond to meals. |
| cleaning.tidy · مرتب کردن مبل | One or pair; cluttered hall | Collect loose items and restore cushions | PROPOSAL, medium. Visible communal result. |
| cleaning.trash · بیرون بردن زباله | One; bin and confirmed disposal point | Lift bag, carry away, empty bin | OPEN disposal anchor; medium. Consequence of meals. |
| event.cleanup · چالش نظافت | Group; dishes, bottles or spills after party | Assign ordinary cleaning actions before configurable deadline | Liked concept; PROPOSAL trigger/score, large. Coordination challenge. |

## سرگرمی · Entertainment

| Choice ID and label | Who and prerequisites | Action, duration and output | Status, effort and replay value |
|---|---|---|---|
| chat · گپ با دوست | Any free pair; two hall spots | Approach both spots then talk 50 ticks | IMPLEMENTATION DEFAULT, implemented; medium. Pair coordination. |
| dance · رقص | Anyone; hall | Individual elbow dance, 45 ticks | CONFIRMED gesture, implemented provisional art; small. Character expression. |
| setup_tv / setup_ps4 · راه‌اندازی تلویزیون / پلی‌استیشن | Kavian; owned device, working TV for PS4 | Physically connect for 60 ticks; enable device | CONFIRMED, implemented; medium. Makes unlock visible. |
| tv · تماشای تلویزیون | Anyone, Parsa/Parham prefer it; working TV | Watch 60 ticks | CONFIRMED, implemented; small. Repeatable rest. |
| ps4 · بازی با پلی‌استیشن | Anyone, especially Parham; working console | Play 70 ticks | CONFIRMED, implemented; small. Unlock payoff. |
| leisure.couch · بازی دونفره | Pair; working console, seats/controllers | Reserve seats; timed local couch match | PROPOSAL, medium. Social variety. |
| moonwalk · مون‌واک | Kavian, hall | Individual 40-tick glide | CONFIRMED signature, implemented provisional gesture; small. Separate from shared dance. |
| leisure.watch_pair · تماشای دونفره | Parsa and Parham; TV/seats | Sit and watch together for one show | CONFIRMED affinity, PROPOSAL mechanics; medium. Pair activity. |
| leisure.kinect · رقص حرکتی | One or pair; approved Kinect unlock | Match motions then celebrate | PROPOSAL, large. Needs recognition-free input and art. |
| leisure.guitar · گیتار | One performer; instrument unlock | Strum a short phrase, friends listen | PROPOSAL, medium. Requires optional licensed sound. |
| boxing · بوکس دوستانه | Kavian and Mahan; safe hall spots | Timed friendly sparring and cooldown | CONFIRMED pairing, implemented provisional 45-tick session; medium. Distinctive pair. |
| leisure.phones · گوشی‌گردی | Parsa and Parham; free sofa | Sit together, scroll, laugh, release seats | Liked concept; PROPOSAL timing, medium. Quiet social beat. |
| leisure.mench · منچ | Parham, owner wording “mench” | Action/object/output await clarification | OPEN, effort unknown. Preserve wording. |
| event.remote · کنترل کجاست؟ | TV viewers; working TV | Pause show, find remote, resume | Liked concept; PROPOSAL search rules, medium. Interrupt routine. |
| event.sofa · جای خوب مبل | Two friends, same seat | Dispute, choose seat, release reservation | Liked concept; PROPOSAL resolution, medium. Seat scarcity. |
| event.doorbell · زنگ در | One responder, entrance | Hear bell, walk to door, greet | Liked concept; OPEN visitors/assets, medium. Break routine. |
| event.foonfoonak · فونفونک | All five; all available | Prompt and tap each response before timer | Liked concept; OPEN timing/accessibility/rewards, medium. Group challenge. |

## موسیقی · Music

| Choice ID and label | Who and prerequisites | Action, duration and output | Status, effort and replay value |
|---|---|---|---|
| music_play / music_quiet · پخش چراغ‌های هال / قطع موسیقی | Anyone, hall; optional original loop | Walk to controls, operate 10 ticks, play or pause music independently of alerts | IMPLEMENTATION DEFAULT, implemented; small. Player control. |
| music.chill · دیپ هاوس | Anyone; approved vibe definition | Set chill mood until changed; influence ambient weights | CONFIRMED preference, OPEN weights, medium. Alters evening. |
| music.hard · تکنوی سنگین | Anyone; approved hard vibe | Set mood, light accents, more dancing; respect reduced motion | CONFIRMED preference, OPEN effects, medium. High-energy variation. |
| music.persian · موسیقی ایرانی | Anyone; licensed track | Choose specific track separately from vibe; loop or stop | OPEN rights and playlist, small. Repertoire. |
| music.birthday · آهنگ تولد | Anyone; authorized party recording | Choose track for celebration, restore prior selection | OPEN rights, medium. Occasion-specific. |
| music.playlist · فهرست شخصی | One; supplied licensed media | Select playlist and track, skip unavailable files | OPEN supplied files, medium. Personalization. |
| event.joint · دورهمی گروهی | Eligible group; approved joint unlock | Gather, sunglasses, techno override, elbow dance, jump/hug, tongue-out, resolve and restore previous audio/state | CONFIRMED sequence; OPEN unlock, final art and event track. Large; bounded group payoff. |
| event.legendary · شب افسانه‌ای | Group; approved energy threshold | Escalating timed party phases then recovery | Liked concept; OPEN trigger, rewards and transitions, large. Multi-stage replay. |

## خواب · Sleep

| Choice ID and label | Who and prerequisites | Action, duration and output | Status, effort and replay value |
|---|---|---|---|
| rest · استراحت روی تخت | Anyone tired; master bed | Rest 60 ticks, recover fatigue; more likely at night | IMPLEMENTATION DEFAULT, implemented; small. Supports day/night. |
| sleep.sofa · چرت روی مبل | Anyone, free sofa seat | Reserve sofa, nap then wake; release on interruption | PROPOSAL, medium. Alternative location. |
| sleep.night · خواب شبانه | Tired resident; simulated night, available bed | Choose allowed location, sleep until recovery/wake trigger | CONFIRMED cycle; OPEN duration and interruption policy, medium. Schedule variety. |

## دستشویی · WC

| Choice ID and label | Who and prerequisites | Action, duration and output | Status, effort and replay value |
|---|---|---|---|
| guest_wc · استفاده از دستشویی مهمان | One; existing guest WC free | Reserve, enter, 32 ticks, release | IMPLEMENTATION DEFAULT, implemented; small. Exclusive resource. |
| wc.master · استفاده از حمام مستر | One; approved permission, existing bathroom | Walk to bathroom, privacy interval, release | OPEN access policy, medium. Uses distinct existing room. |
| event.wc_queue · صف دستشویی | Two or more; occupied guest WC | Wait at traced queue anchor; choose order, patience reaction; release on cancel | Liked concept; OPEN queue priority, medium. Scheduling. |

## بالکن · Balcony

| Choice ID and label | Who and prerequisites | Action, duration and output | Status, effort and replay value |
|---|---|---|---|
| cigarette / iqos · سیگار / آیکوس | One; Mahan requests either, existing balcony | Walk, finite 36-tick session; IQOS prop character-specific | CONFIRMED, implemented with temporary art; small. Distinct request choices. |
| balcony · استراحت در بالکن | Anyone, Parsa likes it; balcony | Pause for view 55 ticks, reduce fatigue | IMPLEMENTATION DEFAULT, implemented; small. Quiet alternative. |
| balcony.sit · نشستن روی صندلی | One; owned table/chair if approved | Reserve seat, relax, release | OPEN object unlock, small. Visible furnishing. |
| balcony.social · گپ بالکن | Pair; two free spots | Meet and talk or smoke together briefly | PROPOSAL, medium. Social alternative. |
| balcony.gather · جمع شدن در بالکن | Group; event requests it, capacity available | Reserve positions, wait for all or cancel | OPEN capacity/location for each event, large. Supports gatherings. |

## First batch and decisions

Keep the two named journeys, existing cleanup, rest, pair chat and owned-device setup as the first playable batch. Next candidates for owner review are fridge inspection, a shared TV/phone moment and guest-WC queuing. Each reuses traced anchors and existing household state. Confirm triggers, interruption rules, production durations and reward eligibility before expansion. Copyrighted recordings, a final visitor cast, new furniture and the meaning of mench remain open.
