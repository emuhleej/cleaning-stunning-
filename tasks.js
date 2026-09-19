export const dailyTasks = [
  { id: "make-bed", label: "Make the bed" },
  { id: "dishes-counters", label: "Clear dishes and wipe the counters" },
  { id: "ten-minute-tidy", label: "Do a 10-minute tidy" },
  { id: "bathroom-wipe", label: "Wipe the bathroom sink" },
  { id: "floor-check", label: "Check high-traffic floors" },
  { id: "trash-laundry", label: "Check the trash and laundry" }
];

export const weeklySchedule = [
  {
    key: "sunday",
    day: "Sunday",
    room: "Kitchen",
    description: "Clear the busiest surfaces and reset the heart of the home.",
    tasks: [
      { id: "clear-counters", label: "Clear and wipe all counters" },
      { id: "sink-stovetop", label: "Clean the sink and stovetop" },
      { id: "appliances", label: "Wipe appliance fronts" },
      { id: "fridge-check", label: "Remove old food from the fridge" },
      { id: "kitchen-floor", label: "Sweep and mop the floor" }
    ]
  },
  {
    key: "monday",
    day: "Monday",
    room: "Bathrooms",
    description: "A focused disinfect, scrub, and restock.",
    tasks: [
      { id: "toilet", label: "Disinfect the toilet" },
      { id: "sink-mirror", label: "Clean the sink and mirror" },
      { id: "tub-shower", label: "Scrub the tub or shower" },
      { id: "bathroom-floor", label: "Sweep and mop the floor" },
      { id: "towels-supplies", label: "Replace towels and restock supplies" }
    ]
  },
  {
    key: "tuesday",
    day: "Tuesday",
    room: "Bedrooms",
    description: "Make each bedroom feel calm and ready for rest.",
    tasks: [
      { id: "bed-linens", label: "Change or straighten the bed linens" },
      { id: "bedroom-dust", label: "Dust furniture and lamps" },
      { id: "clothes-away", label: "Put away clothes and shoes" },
      { id: "nightstands", label: "Clear and wipe nightstands" },
      { id: "bedroom-floor", label: "Vacuum or sweep the floor" }
    ]
  },
  {
    key: "wednesday",
    day: "Wednesday",
    room: "Living Areas",
    description: "Reset the spaces where you relax and spend time.",
    tasks: [
      { id: "living-declutter", label: "Return loose items to their homes" },
      { id: "living-dust", label: "Dust tables, shelves, and décor" },
      { id: "electronics", label: "Wipe screens and electronics" },
      { id: "upholstery", label: "Straighten and vacuum upholstery" },
      { id: "living-floor", label: "Vacuum or sweep the floor" }
    ]
  },
  {
    key: "thursday",
    day: "Thursday",
    room: "Floors & Laundry",
    description: "Finish the cleaning week with fresh floors and clothes.",
    tasks: [
      { id: "gather-laundry", label: "Gather and sort the laundry" },
      { id: "wash-laundry", label: "Wash the next load" },
      { id: "fold-away", label: "Fold and put away clean clothes" },
      { id: "vacuum-carpets", label: "Vacuum rugs and carpeted rooms" },
      { id: "mop-hard-floors", label: "Sweep and mop hard floors" }
    ]
  }
];

export const monthlySchedule = [
  {
    key: "week-1",
    week: "Week 1",
    focus: "Fridge & Pantry",
    description: "Clear expired items, wipe shelves, and make food easier to find.",
    tasks: [
      { id: "expired-food", label: "Discard expired food" },
      { id: "fridge-shelves", label: "Wipe fridge shelves and drawers" },
      { id: "pantry-shelves", label: "Wipe pantry shelves" },
      { id: "group-food", label: "Group similar foods together" },
      { id: "shopping-list", label: "Add needed staples to the shopping list" }
    ]
  },
  {
    key: "week-2",
    week: "Week 2",
    focus: "Baseboards & Doors",
    description: "Catch the edges and touchpoints that daily cleaning misses.",
    tasks: [
      { id: "dust-baseboards", label: "Dust the baseboards" },
      { id: "wipe-doors", label: "Wipe door faces and frames" },
      { id: "handles", label: "Disinfect handles and knobs" },
      { id: "switches", label: "Clean light switches" },
      { id: "wall-marks", label: "Spot-clean wall marks" }
    ]
  },
  {
    key: "week-3",
    week: "Week 3",
    focus: "Windows & Blinds",
    description: "Let in more light with a quick window refresh.",
    tasks: [
      { id: "dust-blinds", label: "Dust blinds or shades" },
      { id: "window-glass", label: "Clean the inside window glass" },
      { id: "window-sills", label: "Wipe window sills" },
      { id: "window-tracks", label: "Vacuum window tracks" },
      { id: "screens-curtains", label: "Check screens and curtains" }
    ]
  },
  {
    key: "week-4",
    week: "Week 4",
    focus: "Closets & Decluttering",
    description: "Finish the month by making one storage area easier to use.",
    tasks: [
      { id: "choose-closet", label: "Choose one closet or storage area" },
      { id: "donation-bag", label: "Fill one donation bag" },
      { id: "sort-items", label: "Group similar items together" },
      { id: "wipe-shelves", label: "Wipe shelves and containers" },
      { id: "return-items", label: "Return loose items to their homes" }
    ]
  }
];
