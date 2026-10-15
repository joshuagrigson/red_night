#!/bin/bash
# id ratio texsize
opt() { npx gltf-transform optimize props_src/$1/$1.gltf optp/$1.glb --compress false --texture-compress webp --texture-size $3 --simplify true --simplify-ratio $2 --simplify-error 0.02 --join true --flatten true --instance false >/dev/null 2>&1 && echo "$1 $(stat -c%s optp/$1.glb)" || echo "FAIL $1"; }
opt fire_hydrant .03 256; opt metal_trash_can .12 256; opt utility_box_01 .35 256; opt utility_box_02 .3 256
opt concrete_road_barrier .03 256; opt old_tyre .6 256; opt trashbag .4 256
opt cardboard_box_01 .08 256; opt Barrel_01 .6 256; :
opt shrub_02 .08 512; opt shrub_03 .2 512; opt shrub_04 .08 512; opt rock_07 .05 256; opt rock_09 .05 256; opt stone_01 .02 256
opt planter_box_01 .3 256; opt covered_car .2 256; opt security_light .4 256; opt street_lamp_01 .1 256
opt painted_wooden_bench 1 256; opt planter_pot_clay .5 256
