---
layout: default
title:  "Jupyter Notebook in Firefox"
date:   2017-10-31 19:00:00
categories: main
---

# Useful Jupyter Notebook Tips - Setting Default Browser

---

Something that I have been finding works quite well is using jupyter in
Firefox, and my browsing in Chrome. It's a pain to get the notebook server set up and copy the link every time into a Firefox window. Ok, maybe not a pain, but why not set a default.

So following the answer here: [https://stackoverflow.com/a/35578527/5392922](https://stackoverflow.com/a/35578527/5392922):

create `~/.jupyter/jupyter_notebook_config.py` by:
{% highlight shell %}
jupyter notebook --generate-config
{% endhighlight %}

Then open `~/.jupyter/jupyter_notebook_config.py` and change the line `# c.NotebookApp.browser = ''`. The suggested change is `c.NotebookApp.browser = '/usr/bin/google-chrome'`. I don't have Firefox in `/usr/bin/`, so the change is:
{% highlight shell %}
c.NotebookApp.browser = u'open -a /Applications/Firefox.app/Contents/MacOS/firefox %s'
{% endhighlight %}

The `u` and `%s` are needed for string comprehension, but this line should mean, that by default Firefox opens when `jupyter notebook` is run.
