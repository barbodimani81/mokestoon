# 03 — Character Specification

## 1. Shared character rules

- All five are male friends and are represented by distinct game sprites inspired by the owner's supplied reference photos.
- Preserve written outfit/body/behavior descriptions even if a reference photo shows temporary clothing.
- Every character shares the happy tongue-out gesture.
- Every character can perform the shared elbow-swing dance: hands begin down, elbows swing up toward the right and then the left in a repeated rhythm.
- All can smoke cigarettes individually or together as ambient/social behavior. This does not mean the animation runs continuously.
- Each has an IQOS device with the specified color.
- When patience is exhausted, a character can enter temporary savage mode: more dramatic/aggressive comedic reactions, not a permanent personality rewrite.
- During the joint group event, participants take out sunglasses, techno begins, the shared dance plays, then jumping/hugging and happy reactions follow.
- Character dimensions and sprite proportions must be calibrated to one another; exact pixel height is an art-direction decision, not literal real-world scaling.

## 2. Barbod

**Visual:** 178 cm, approximately 85 kg, medium/slightly muscular build. Red Under Armour jacket, white shorts (shalvarak), no hat. Beard and not-long hair. Carries a black water bottle. IQOS is red.

**Personality/behavior:** loves dancing and sweets, has low patience, often falls down. Likes group dancing. May raise both hands and jump as a signature excited reaction.

**Animation set:** idle, walk, task interaction, water-bottle carry/use, smoke, eat sweets, fall/get up, hands-up jump, tongue-out happy, savage reaction, elbow-swing dance, group sunglasses/dance/jump/hug.

## 3. Kavian

**Visual:** 182 cm, approximately 95 kg, bulky build. Grey-blue hoodie, black pants, glasses. Medium-length messy/clumsy hair, slight beard. IQOS is black.

**Personality/behavior:** helpful and organizer-like, medium patience. Likes boxing with Mahan, food, energy drinks, drinking, smoking, hugging and laughing. Sometimes falls. Most likely to clean the house and wash dishes, though other friends can help.

**Special behavior:** when TV/PS4/Kinect equipment is unlocked and needs setup, Kavian physically walks to the area and performs a setup sequence rather than making the object appear ready instantly.

**Signature dance:** moonwalk. This is individual and separate from the shared elbow-swing dance.

**Animation set:** idle, walk, clean floor, wash dishes, carry/put away item, TV/console setup, boxing stance/punches, moonwalk, hug, laugh, smoke, eat/drink, fall/get up, tongue-out happy, savage reaction, shared dance/group event.

## 4. Mahan

**Visual:** 186 cm, thin/lean. Almost bald, long beard, fair skin. Grey long-sleeved T-shirt and grey sweatpants. IQOS is grey.

**Personality/behavior:** likes dancing, smokes frequently, sometimes lies on the couch. Likes boxing with Kavian, energy drinks and food. Medium patience. May smoke with any character who wants to join.

**Special behavior:** when wasted, becomes very energetic and jumps a lot. This is a state-dependent animation/behavior modifier, not his default idle behavior.

**Signature reaction:** both hands raised, swinging in the air from right to left.

**Animation set:** idle, walk, couch rest, smoke, food/energy drink, boxing, dance, high-energy jump loop, hands-up side swing, fall/get up, tongue-out happy, savage reaction, shared dance/group event.

## 5. Parsa

**Visual:** 192 cm, thin/tall. Green hoodie, grey shorts (shalvarak), short hair, slight beard. IQOS is black.

**Personality/behavior:** calm, smokes frequently, willing to do activities with anyone. Likes rolling the joint, watching TV, sitting on the balcony and sometimes dancing with everyone.

**Signature greeting:** handshake followed by a kiss greeting. Exact choreography/meaning should be confirmed before final animation; implement as an optional friendly greeting with no romantic implication encoded by default.

**Animation set:** idle, walk, roll event prop, smoke, TV watching, balcony sit, greeting, shared dance, tongue-out happy, savage reaction, group sunglasses/dance/jump/hug.

## 6. Parham

**Visual:** 174 cm, approximately 80 kg. No beard, distinctive mustache, glasses. Black hoodie and black sweatpants. IQOS is black.

**Personality/behavior:** likes PS4 and “mench” (keep this label as provided until the owner clarifies the exact in-game activity), likes techno and dancing with everyone, loves food and has low patience. May sit with Parsa to watch TV, play PS4 or scroll phones.

**Signature reaction:** laughs hard while holding his belly and also raises both hands into the air.

**Animation set:** idle, walk, PS4 game, TV with Parsa, phone scroll, food, belly laugh, hands-up laugh, techno dance, smoke, fall/get up if needed by shared systems, tongue-out happy, savage reaction, shared dance/group event.

## 7. Shared state model

A character may have:
- `mood`: neutral, happy, annoyed, savage, tired, excited.
- `activity`: idle, walking, interacting, socializing, resting, dancing, event_locked.
- `patience`: bounded value defined in gameplay tuning.
- `energy/intoxication`: optional simulation values only if the feature is approved and kept readable.
- `current_request_id`, `current_task_id`, `current_target_id`.

Do not conflate mood with activity. A happy character can be walking; an annoyed character can still complete a task.

## 8. Asset production rules

- Create a consistent top-down/three-quarter top-down pixel-art style suitable for a top-down map. Do not mix side-view portraits with top-down gameplay sprites.
- Each character requires directional movement and action silhouettes that remain recognizable at mobile display scale.
- Build animation states incrementally. First deliver idle + four-direction walk + interact; then signature actions; then group sequences.
- Use approved source images only as visual reference. Do not commit private reference photos to a public repository unless the owner explicitly approves.
- A sprite atlas must include metadata mapping stable animation IDs to frame ranges and frame durations.
