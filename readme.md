# Planets
This demo is similar to [Variety Shoe](https://github.com/ixd-system-design/variety-shoe). It uses a JSON [dataset of planets](https://www.mongodb.com/docs/atlas/sample-data/sample-guides/), along with a set of planet icons via [Adobe](https://stock.adobe.com/ca/). 

# <kbd>[Use this template]((https://github.com/new?template_name=json-planets&template_owner=ixd-system-design)</kbd>

[![Use this template](https://img.shields.io/badge/-Use%20this%20template-brightgreen?style=for-the-badge)](https://github.com/new?template_name=json-planets&template_owner=ixd-system-design)


# Sorting
A key feature in this demo is the sorting of data. In particular it's possible to sort an array of objects based on some common property that all those objects have. The [array sort function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort) is quite useful here. In this demo, you'll find two varations: sorting by temperature, and also sorting by distance from the sun.

# Dynamic Colours
It's possible to use numeric values from a dataset as part of your content and markup, but it's also possible to use the same data to create CSS styling. For example, we can generate a background colour for each planet based on the given temperature using some math and the [HSL colour model](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/hsl). 

# Dynamic Images
Given the name of a planet, (e.g. Saturn) we can dynamically generate a corresponding file path that points to an image. (e.g. assets/Saturn.svg). In this example, you'll find that we use this technique to add icons to each planet.

# Learning Prompts
- modify the template to show the composition of the atmosphere for each planet.
- modify the JSON file to include the "dwarf planet" Pluto
- Use Webfonts to support an outer space narrative.