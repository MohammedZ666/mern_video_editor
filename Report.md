# [Task 2](https://github.com/MohammedZ666/video_editor/blob/main/task_2.txt) #

## This document briefly explains the video edition principles of this web application ##

## Introduction ##
Video edition was only a niche field to work in, until the advent of youtube and very high speed internet. Having a youtube channel meant having an globally broadcasting TV channel with the ability to run ads, without having to sign contracts or deal with buisenesses **for free**. One only needed to focus in making their videos more useful and/or entertaining. Many other social media companies started follwing the same model of monetizing the videos of their users, paying them an amount the get from the advertizers and keeping **the difference**. Which eventually, made many tech billonaires and youtuber multimillionaires.  

This created an extreme demand for an affordable & commercial-class video-editor that can run on anybody's pc and can edit videos that is required to surpass the best video editions done by the professionals (due to mass competition in youtube and other social media). Many companies rose to the demand. Adobe Premiere of Adobe, Final Cut of Apple Inc. and Lighthouse to name a few. Although they are serving their customers very well, the fundamental flaw  in choosing their software stack remains.

The flaw is namely the native nature of their software i.e. their software runs on the local machine. All video editing software consumes a lot of memory. Although google searches might suggest that an 8 GB RAM might be enough, but modern operating systems consumes a lot of RAM already. On top of that, we have a plethora of  background applications running. Which means our workstation, would require significantly expensive and powerful hardware before we can run a relatively cheap software simply to edit videos and not to find the cure to cancer. 

Of course, there are free and open-source online/offline editors. But the features they provide, is far less than what professional and popular video editors might provide. Therefore, we need a video-editing software whose front-end (GUI) runs on end devices and the backend (which consumes a lot of memory) runs on servers. That way the users can pay for the hardware and software by simply renting/subscribing for them, and that can be a win-win for both them and the developers. 

This web app does the same thing. Although it does not provide much of the features as a popular video edition app, it can run on almost all devices very easily, provided they have an active and fast internet connection. 

### After reading, readers will be able to- ###
0. See how the application works (basic video walkthrough)
1. Understand the core video edition principles of this application
2. Understand the basics of [melt](https://www.mltframework.org/docs/mltxml/)
3. Get familiar with the project structure, files and directories
4. Evaluate my remarks

## 0. See how the application works (basic video walkthrough) ##
In this walkthrough, the readers will simply see me trimming a [video](https://www.youtube.com/watch?v=9qs1FmMXaTE). I tried to keep the video as short and as concise as possible, providing a simple demo.

## 1. Understanting the core video edition principles of this application ##
This video editing app has a frontend built with `React.js` and a backend built with `Node.js`. The video and audio files get uploaded to the backend at first. The frontend takes the commands for video-edition and instantly forwards it to the backend. The backend creates and edits an mlt-xml file, which is a markup document. This document essentially indicates how to patch up audio and video clips together to output the final video file. 

In a native video editing app, backend and frontend part of the app remain on the same computer. Which causes the app to consume a lot of user's memory and causing the user to acquire expensive hardware (RAM, CPU with more cache and a higher clock speed, and a better GPU). In the case of this video editing app, the backend (or the principal memory consuming part of the app) resides on a host machine. Which saves the user from acquiring expensive hardware, yet making sure their is no compromise in the quality of edition. 

***But if the internet speed is slower, it could significantly worsen the user experience.***

## 2. Understand the basics of [melt](https://www.mltframework.org/docs/mltxml/) ##
Melt or Media Lovin Toolkit is open source library. It provides a toolkit for broadcasters, video editors, media players, transcoders, web streamers and many more types of applications. The functionality of the system is provided via an assortment of ready to use tools, XML authoring components, and an extensible plug-in based API. This library enables video edtion by means of mlt xml files.

An melt xml document mainly serves to *markup* which files to use where and for how long. On top of that it can also be used to apply filters to the dersired frames. This document is essentially a set of ***producers***. A ***producer*** is a unique media clip which has its own audio, video, both or either one of them. An example is as follows:

```
<mlt>
  <producer id="producer0">
    <property name="resource">video.mp4</property>
  </producer>
  <producer id="producer1">
    <property name="resource">audio.mp3</property>
  </producer>
  <playlist id="playlist0">
    <entry producer="producer0" in="0" out="2999"/>
    <entry producer="producer1" in="0" out="999"/>
    <entry producer="producer0" in="3000" out="6999"/>
  </playlist>
</mlt>
```
In the above code, producer0 and and producer1 contains one video and audio file respectively under two consecutive ***producer*** opening and closing tag. The next tag is the ***playlist*** tag which essentially *marks-up* how the files should be patched up to a final output video file. All in and out parameters of the ***entry*** tags are absolute frame positions relative to the producer being appended to the playlist. 

If one wants to add a filter or watermark, a ***tractor*** component needs to be involved. Following contains an example:

```
<mlt>
  <producer id="producer0">
    <property name="resource">clip1.dv</property>
  </producer>
  <producer id="producer1">
    <property name="resource">clip2.dv</property>
  </producer>
  <playlist id="playlist0">
    <entry producer="producer0" in="0" out="2999"/>
    <blank length="1000"/>
    <entry producer="producer0" in="3000" out="6999"/>
  </playlist>
  <playlist id="playlist1">
    <blank length="3000"/>
    <entry producer="producer1" in="0" out="999"/>
  </playlist>
  <tractor id="tractor0">
    <multitrack>
      <track producer="playlist0"/>
      <track producer="playlist1"/>
    </multitrack>
    <filter>
      <property name="track">0</property>
      <property name="mlt_service">greyscale</property>
    </filter>
  </tractor>
</mlt>
```

In the above code, using ***playlists*** introduced in the above code we created ***tracks***. These ***tracks*** are kept under ***multitrack*** opening and closing tags, to indicate which tracks we want to apply a filter to. The type of filter one wants to apply is kept under the ***filter*** tag. Finally, these two ***filter*** and ***multitrack*** tags are kept under a ***tractor*** to indicate the application of its child ***filter*** to her sibling ***multitrack***.

These are its basic features. One might be surprised to see how convenient how **melt** has made it so for a developer to develop video edition applications for free. If not for melt, we would have to consider working with bits and bytes quite literally. 



### 3. Getting familiar with the project structure, files and directories ###
The project structure has the typical structure of a **MERN** app. Except it does not use mongo db. The `/react` directory contains all the necessary front-end components to be rendered for the user. The entry point of the app is the `server.js` file. The main functions are contained under the `/controller` directory. The directories `/routes` is only an MVC organization strategy that ultimately points to the controller funtions under the `/controller`. 

Therefore, if one want to understand how  the app works, they should have a look under the controller directory. Everything else is more or less insignificant.

### 4. Conclusion and Remarks ###
Hopefully readers were able to grasp the discussion in **1**, **2** and **3**. I would like to end this docuemnt with some concluding remarks. In my observation, if the backend was written in c++, the performance mght have become exponentially better. Since rendering UI in not so important, frameworks like .NET could be easily avoided. On top of that, `open_cv in c++` could be seamlessly integrated. Which might allow us to enable a plethora of features with simple function calls to open_cv apis. For example warping, filter application, inclusion of text and many more. Which would make the job of the developer much, much easier.
  
  On that note, I would like to conclude this brief know-how of this video-editing app.


