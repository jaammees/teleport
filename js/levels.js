var START_PAD        = 1;
var EXIT_PAD         = 2;
var NORMAL_PAD       = 3;
var PAD_WITH_ROBOT   = 4;
var GREEN_PAD        = 5;
var RED_PAD          = 6;

var BLOCKING_PAD     = 7;

var g_levels = [
  {
    "text": [
      "Level 1.",
      "Select a pad to teleport to.", 
      "Each teleport will use one",
      "unit of energy."

    ],

    "startRotation": 0,
    "energy": 8,
    "data": [
      [START_PAD,  0, 0, 0,  0,0,0 ],
      [NORMAL_PAD, 0, 0.4, -6, 0, 0, 0],

      [NORMAL_PAD, -2, 1.1, -12, 0, 0, 0],
      [NORMAL_PAD, 2, 1.1, -12, 0, 0, 0],


      [EXIT_PAD, 0, 2.0,-18,0,0,0]

    ]

  },

  {
    "text": [
      "Level 2.",
      "If a robot sees you",
      "it will drain your energy.",
      ""
    ],
    "energy": 8,
    "robotSpeed": 60,
    "data": [
      [START_PAD, 0, 0, 0,  0,0,0 ],

      [PAD_WITH_ROBOT, -2.5, 2.9, -7,0,0,0],
      [NORMAL_PAD,      0, 0.5,   -7, 0, 0, 0],

      [NORMAL_PAD, 0, 1.5, -12, 0, 0, 0],
      [PAD_WITH_ROBOT, 2, 2.9, -12, 0, 0, 0],

      [EXIT_PAD, 0, 2.3,-20,0,0,0]
    ],
  },


  {
    "text": [
      "Level 3.",
      "You can absorb a robot's",
      " energy by selecting it's pad.",
      ""
    ],
    "startRotation": 0,
    "energy": 2,
    "data": [
      [START_PAD, 0, 0, 0,  0,0,0 ],

      [NORMAL_PAD, 2.5, -0.5, -8, 0, 0, 0],
      [PAD_WITH_ROBOT, -2.5, -0.5, -8, 0, 0, 0],

//      [NORMAL_PAD, 3, 2,-10,  270,0,0],

      [NORMAL_PAD, 0.5, 4,-19, 0,0,270],


      [EXIT_PAD, 4, 3.5,-17,0,0,0]

    ]
  },


  {
    "text": [
      "Level 4.",
      "When on a green pad,",
      "other green pads will",
      "disappear",
      ""
    ],
    "energy": 4,
    "robotSpeed": 30,
    "data": [
      [START_PAD, 0, 0, 3,  0,0,0 ],
      [GREEN_PAD, 0, 0,-3, 0,0,0 ],

      [GREEN_PAD, 0, 2.4,-10, 0,0,0 ],

      [PAD_WITH_ROBOT, -3.5, 2.5, -10, 0, 0, 0],
      [PAD_WITH_ROBOT, 3.5, 2.5, -10, 0, 0, 0],

      [GREEN_PAD, 2, 3.6,-10, 0,0,90],
      [BLOCKING_PAD, 2.4, 3.6,-9, 90,0,0],

      [GREEN_PAD, -2, 3.6,-10, 0,0,270],
      [BLOCKING_PAD, -2.4, 3.6,-9, 90,0,0],

      [NORMAL_PAD, 0, 7,-8, 0,0,180],
      [BLOCKING_PAD, 0, 6,-6, 90,0,0],

      [BLOCKING_PAD, 0, 3.5,-19, 270,0,0],
      [EXIT_PAD, 0, 3.5,-20,0,0,0],

      [NORMAL_PAD, 5.5, 6.5,-22, 0,0,90],
      [GREEN_PAD, 5.5, 6.5,-21, 270,0,0],

      [NORMAL_PAD, -5.5, 6.5,-22, 0,0,270],
      [GREEN_PAD, -5.5, 6.5,-21, 270,0,0],
    ],
    
  },

  {
    "text": [
      "Level 5.",
      "When on a red pad,",
      "other red pads will",
      "disappear",
      ""
    ],
    "energy": 2,
    "robotSpeed": 40,
    "data": [
      [START_PAD, 0, 0, 3,  0,0,0 ],
      [RED_PAD, 0, 0,  -5, 0,0,0 ],


      [PAD_WITH_ROBOT, 4, 0, -5, 0, 0, 0],
      [RED_PAD, 3.5, 0,  -3.5, 90,0,0 ],
      [BLOCKING_PAD, 3.5, 0.2,  -6, 90,0,0 ],

      [RED_PAD, 3, 2,  -5, 0,0,90 ],

      [PAD_WITH_ROBOT, -4, 0, -5, 0, 0, 0],
      [RED_PAD, -3.5, 0,  -3.5, 90,0,0 ],
      [BLOCKING_PAD, -3.5, 0.2,  -6, 90,0,0 ],
      [RED_PAD, -3, 2,  -5, 0,0, 270],


      [RED_PAD, 0, 5,  -12, 270,0,0 ],

      [GREEN_PAD, 0, 6.5,  -19, 90,0,0 ],


      [NORMAL_PAD, 0, 12.5,  -16.5, 0,0,180 ],
      [GREEN_PAD, 0, 12.4,  -16.5, 0,0,0 ],


      [EXIT_PAD, 0, 6,-21,0,0,0],

    ],
    
  },


  {
    "text": [
      "Level 6.",
      "",
      "",
      "",
      ""
    ],
    "energy": 5,
    "robotSpeed": 40,
    "data": [
      [START_PAD, 0, 2, 3,  0,0,0 ],


      [RED_PAD, 2.5, 0,  -6, 0,0,0 ],

      [BLOCKING_PAD, -0.1, 2, -6, 0, 0, 90],
      [BLOCKING_PAD, -0.1, 0.6, -6, 0, 0, 90],
      [GREEN_PAD, -2.5, 0,  -6, 0,0,0 ],


      [RED_PAD, -5.5, 13.9,  -12, 0,0,0 ],
      [GREEN_PAD, -5.5, 14,  -12, 0,0,180 ],

      

      [RED_PAD, 5.5, 10,  -16, 90,0,0 ],
      [GREEN_PAD, 5.5, 10,  -15.7, 90,0,0 ],
      [BLOCKING_PAD, 3.2, 7.5, -8, 90, 0, 0],


      [BLOCKING_PAD, 0, 9.7, -20, 90, 0, 0],

      [EXIT_PAD, 0, 9,-21,0,0,0],
      [BLOCKING_PAD, -0.9, 9.7, -21, 0, 0, 90],
      [BLOCKING_PAD, 0.7, 9.7, -21, 0, 0, 90],

      //[BLOCKING_PAD, 1.6, 10, -20, 90, 0, 0],
      [BLOCKING_PAD, -2.8, 11.6, -20, 90, 0, 0],      

      [BLOCKING_PAD, -1.4, 5, -14, 90, 0, 0],      

      [RED_PAD, 2, 4.9, -18, 0,0,0 ],
      [BLOCKING_PAD, -0.1, 6.9, -18, 0, 0, 90],
      [BLOCKING_PAD, -0.1, 5.5, -18, 0, 0, 90],
      [GREEN_PAD, -2, 4.9, -18, 0,0,0 ],


      [RED_PAD, 0, 11, -28, 90,0,0 ],

      [GREEN_PAD, 0, 11, -27.9, 270,0,0 ],
    ],
    
  },

  {
    "text": [
      "Level 7.",
      "",
      "",
      "",
      ""
    ],
    "energy": 3,
    "robotSpeed": 30,
    "data": [
      [START_PAD, 0, 3, 4,  0,0,0 ],
      [PAD_WITH_ROBOT, 2, 0, -5, 0, 0, 0],
      [NORMAL_PAD, -2, 0, -5, 0, 0, 0],

      [GREEN_PAD, -4, 6.5, -6.3, 270, 0, 0],

      [RED_PAD, -7, 8, -15, 0, 0, 270],
      [PAD_WITH_ROBOT, -3.5, 7.5, -15, 0, 0, 0],


      [GREEN_PAD, 4, 12, -24, 270, 0, 0],
      [RED_PAD, 4, 12, -24, 90, 0, 0],

      [EXIT_PAD, 0, 9,-21,0,0,0],
    ],    
  },


  {
    "text": [
      "Level 8.",
      "",
      "",
      "",
      ""
    ],
    "energy": 3,
    "robotSpeed": 30,
    "data": [
      [START_PAD, 0, 0, 4,  0,0,0 ],

      [PAD_WITH_ROBOT, 0, 6, -6, 0, 0, 0],
      [RED_PAD, 0, 5.4, -6, 180, 0, 0],

      [NORMAL_PAD, 0, 7.5, -12.2, 90, 0, 0],
      [RED_PAD, 0, 7.5, -12, 270, 0, 0],

      [RED_PAD, 0, 11, -1.5, 270, 0, 0],

      [EXIT_PAD, 0, 7.5,-21,0,0,0],
    ],    
  }





];