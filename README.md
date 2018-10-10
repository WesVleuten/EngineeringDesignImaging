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

Now we have a buffer containing the luminosity of every pixel. We filter through the buffer and determine a cutoff point
