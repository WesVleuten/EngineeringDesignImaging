# EngineeringDesignImaging

Lane assit for blind atheletes. Optimized for raspberry pi zero.

## Install
Install is very easy, just run a couple of commands and you're set!
```
npm install
sudo sh installgpuiofunction.sh
```

## Startup-prepare
This should only be done once before you start up the program. This could be automated on startup of the raspberry pi
```
sudo sh setgpiofunction.sh
```

## Startup
```
npm start
```

## How it works

First and foremost we need to capture an image from the sensor. Because of the non blocking nature of Node.JS, we chose to run the image capture in a seperate loop. This way we can decrease the time between taking the image and getting the output.

The Raspberry Pi Zero lacks audio output. However the program requires one, this means we had to make one ourselves. You can easily attach an audio jack to the following GPIO pins.

| Name | Output [pin]    | Channel       |
| ---- | --------------- | ------------- |
| PWM0 | GPIO18 [pin 12] | Left channel  |
| PWM1 | GPIO19 [pin 33] | Right channel |
| GND  | Ground [pin 39] | Ground        |

### Image capture

For the image capture we have found that the `raspiyuv` command works best. With the added argument `-l` it only returns the luminosity channel of the captured image. This buffer is given to the next part of the program.

### Line isolation

Now we have a buffer containing the luminosity of every pixel. We use a cutoff point prevously determined or determined by the config. With this cutoff point we go through the buffer and setting every pixel either 1 or 0. 1 meaning there is a line here and 0 being ther isn't a line here.

### Middle-out current lane

Using the middle of the picture we can find the lines that the current user is in. Going from the middle vertically outwards we set the first pixel we find being one to a two.

After this we remove all 1's from the picture, leaving only the 2's behind showing a picture containing only some pixels which represent the lines of the user's lane.

### Hough

Now we get to the fun stuff. Using the hough algorithm we can get mathametical lines by putting in all pixels. Every "1" pixel determined by the perious part of the algorithm is transformed into a sinus, the sinus repesents all different lines that can go through that pixel. Using the crosspoints of those sinuses we can determine the line that goes through all those points.

Sinus formula
```
r = x * cos(omega) + y * sin(omega)
```

If we find 2 crosspoints we can go on to the next part of the algorithm. But if we don't we return to the previous part "Line isolation" and adjust the cutoff point.

### Hough calculation

Now we have 2 crosspoints in hough space. We need to convert them to somehting we can use in mathametical terms. We can do this using the following formula:

```
y = - ( cos(omega) / sin(omega) ) * x + r / sin(omega)
```

### Lane position

Using the mahtametical formulas and the assumtion that the user is in the middle of the picture we can determine where the user is on the lane. 

```
position = -1 + 2 * (screenMiddle - leftline) / (rightline - leftline)
```

This forumla return a value between -1 and 1. This determines the position in lane with -1 being left side, 1 being the right side and 0 being the middle of the lane. You can set a leeway variable so it beeps after corssing a surten point.
