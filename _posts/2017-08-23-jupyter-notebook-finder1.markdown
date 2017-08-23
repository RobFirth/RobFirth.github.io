---
layout: default
title:  "Jupyter Notebook Locator Script"
date:   2017-08-23 17:50:00
categories: main
---

# Useful Jupyter Notebook Finder Shell Script

___
![Tidier Than Normal]( {{ "/images/tidier_than_normal.png" | absolute_url }} " ")

___
One of my bad habits, whether it is in a browser, text editor or a terminal, is to have far too many tabs open. Normally I'll hit a limit and go on a tab-closing frenzy. This can become problematic when I'm running a Jupyter Notebook server from the terminal, and I lose the console tab after having closed the localhost browser tab.
 If I'm organised, I'll be running one or two, at localhost:8888 and localhost:8889, but if I've been going a while we can get in a bit of a mess.

 Apparently I'm not the only one, and on the LSST Slack, Robert Lupton suggested the following code snippet to sniff out notebooks:

{% highlight shell %}
#!/bin/bash
#
# Show the paths to currently running jupyter notebooks
#
for pid in $(ps lx | awk '/jupyter/ && /python/ && !/awk/ {print $2}'); do
      echo $(lsof -P -p $pid | awk '/ DIR / || /LISTEN/ { print $9 }' | uniq)
done

{% endhighlight %}

Which is pretty handy!

But...

In the process of playing around with this I realised that this functionality was already baked into my jupyter. Navigating to http://127.0.0.1:8888 threw this at me, rather than the tree I was expecting:

![Jupyter Thought of This!]( {{ "/images/jupyter_screenshot.png" | absolute_url }} " ")

So they got there first - and with a reminder about the neat token auth features to boot. But there is a consolation - the shell script does seem faster!
