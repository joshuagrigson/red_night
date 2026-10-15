// Unreal-mannequin (Quaternius UAL) bone names -> the game's Mixamo-style names (as boneKey() sees them, and as written in the GLBs)
const MAP = {
  pelvis: 'Hips', spine_01: 'Spine', spine_02: 'Spine1', spine_03: 'Spine2', neck_01: 'Neck', Head: 'Head',
};
for (const [s, S] of [['l', 'Left'], ['r', 'Right']]) {
  Object.assign(MAP, {
    ['clavicle_' + s]: S + 'Shoulder', ['upperarm_' + s]: S + 'Arm', ['lowerarm_' + s]: S + 'ForeArm', ['hand_' + s]: S + 'Hand',
    ['thigh_' + s]: S + 'UpLeg', ['calf_' + s]: S + 'Leg', ['foot_' + s]: S + 'Foot', ['ball_' + s]: S + 'ToeBase', ['ball_leaf_' + s]: S + 'Toe_End',
  });
  for (const [f, F] of [['thumb', 'Thumb'], ['index', 'Index'], ['middle', 'Middle'], ['ring', 'Ring'], ['pinky', 'Pinky']]) {
    for (let i = 1; i <= 3; i++) MAP[`${f}_0${i}_${s}`] = `${S}Hand${F}${i}`;
    MAP[`${f}_04_leaf_${s}`] = `${S}Hand${F}4`;
  }
}
// no counterpart: UAL 'root' (the ground/root-motion bone above pelvis) and the game's 'HeadTop_End' (a leaf above Head)
const UNMAPPED_SRC = ['root'], UNMAPPED_TGT = ['HeadTop_End'];
const boneKey = n => n.replace(/^mixamorig[:_]?/i, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
module.exports = { MAP, UNMAPPED_SRC, UNMAPPED_TGT, boneKey };
