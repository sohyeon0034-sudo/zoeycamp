import React from 'react';
import CharacterBodyFace from './CharacterBodyFace';
import TwinTailsHair from './TwinTailsHair';
import SideBraidHair from './SideBraidHair';
import HoodieOutfit from './HoodieOutfit';
import SweaterSkirtOutfit from './SweaterSkirtOutfit';

// type: 'twinTails' | 'sideBraid' | ...
export function Character3D({
  hair = 'twinTails',
  outfit = 'hoodie',
  position = [0, 0, 0],
}) {
  return (
    <group position={position}>
      <CharacterBodyFace />
      {hair === 'twinTails' && <TwinTailsHair />}
      {hair === 'sideBraid' && <SideBraidHair />}
      {outfit === 'hoodie' && <HoodieOutfit />}
      {outfit === 'sweaterSkirt' && <SweaterSkirtOutfit />}
    </group>
  );
}
export default Character3D;
