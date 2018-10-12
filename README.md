# EngineeringDesignImaging

Lane assit for blind atheletes. Optimized for raspberry pi zero.


## How it works

First and foremost we need to capture an image from the sensor. Because of the non blocking nature of Node.JS, we chose to run the image capture in a seperate loop. This way we can decrease the time between taking the image and getting the output.

The Raspberry Pi Zero lacks audio output. However the program requires one, this means we had to make one ourselves. You can easily attach an audio jack to the following GPIO pins.

GPIOXX | Left channel
GPIOXX | Right channel
GPIOXX | Ground

### Image capture

For the image capture we have found that the `raspiyuv` command works best. With the added argument `-l` it only returns the luminosity channel of the captured image. This buffer is given to the next part of the program.

### Line isolation

Now we have a buffer containing the luminosity of every pixel. We use a cutoff point prevously determined or determined by the config. With this cutoff point we go through the buffer and setting every pixel either 1 or 0. 1 meaning there is a line here and 0 being ther isn't a line here.

### Middle-out current lane

Using the middle of the picture we can find the lines that the current user is in. Going from the middle vertically outwards we set the first pixel we find being one to a two.

After this we remove all 1's from the picture, leaving only the 2's behind showing a picture containing only some pixels which represent the lines of the user's lane.

### Hough

Now we get to the fun stuff. Using the hough algorithm we can get mathametical lines by putting in all pixels. Every "1" pixel determined by the perious part of the algorithm is transformed into a sinus, the sinus repesents all different lines that can go through that pixel. Using the crosspoints of those sinuses we can determine the line that goes through all those points.

If we find 2 crosspoints we can go on to the next part of the algorithm. But if we don't we return to the previous part "Line isolation" and adjust the cutoff point.

### Hough calculation

Now we have 2 crosspoints in hough space. We need to convert them to somehting we can use in mathametical terms.
