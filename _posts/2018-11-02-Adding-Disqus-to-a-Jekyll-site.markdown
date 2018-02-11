---
layout: default
title:  "Adding Disqus to a Jekyll site"
date:   2018-02-11 17:00:00
categories: main
comments: True
---

# Adding Disqus to a Jekyll site

---
The easiest and cleanest way to do it is to create a partial with the HTML that disqus provides in your _includes/ folder (e.g. _includes/disqus.html) and then just including it in your posts layout file (e.g. _layouts/post.md):


{% highlight jekyll %}
{% raw %}
---
layout: default
title:  "Adding Disqus to a Jekyll site"
date:   2018-01-01 17:00:00
categories: main
comments: True
---
{% endraw %}
{% endhighlight %}


{% highlight jekyll %}
{% raw %}
{% if page.comments %}
  {% include disqus.html %}
{% endif %}
{% endraw %}
{% endhighlight %}
