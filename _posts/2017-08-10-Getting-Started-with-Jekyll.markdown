---
layout: default
title:  "Getting Started with Jekyll and Github Pages"
date:   2017-08-10 19:00:00
categories: main
---

# Getting Started with Jekyll and Github Pages

---

> _note_: I'm going to assume that your [GitHub Pages](https://pages.github.com/) have been set up.

---

## Rationale
I go ages between posts, and, having switched onto a new machine, I've forgotten my workflow and what tools I need to interact and update my pages. I can add new posts, but it would be super helpful to see them locally etc. this is possible, but my memory is like a colander sometimes. I should write some of this down.

## What do I need?

I'll start off by following the docs here - https://jekyllrb.com/docs/home/

 * GitHub Pages repo set up &#10004;
 * GNU/Linux, Unix, or macOS &#10004;
 * Ruby version 2.1 or above, including all development headers
 * RubyGems
 * GCC and Make (in case your system doesn’t have them installed, which you can check by running `gcc -v` and `make -v` in your system’s command line interface)

So first off I need to get Ruby on my machine.

### Ruby
OK, so let's get Ruby from here https://www.ruby-lang.org/en/downloads/. I'm on a Mac, so I can choose between [rbenv](https://github.com/rbenv/rbenv), [RVM](http://rvm.io/) and source. The environment/package managers look a _bit_ heavyweight for my needs, so I'll just have a go from source.

I'll download the latest stable version (2.4.2 at the time of writing) unpack, configure and make.

{% highlight shell %}

mv ~/Downloads/ruby-2.4.2.tar.gz ~/tmp/
cd ~/tmp/
tar -xvf ruby-2.4.2.tar.gz
cd ruby-2.4.2
./configure
make
sudo make install

{% endhighlight %}

> *Note*: _you might need to run configure with `./configure --with-openssl-dir=/usr/bin` in order to avoid the openSSL error in the "*Install Jekyll*" section below._

So to double check,
{% highlight shell %}
> ruby -v
ruby 2.4.2p198 (2017-09-14 revision 59899) [x86_64-darwin16]
{% endhighlight %}

Neat. So
* Ruby version 2.1 or above, including all development headers &#10004;

### RubyGems
RubyGems is a package management framework for Ruby - https://rubygems.org/pages/download/. Lets grab the tarball and install.

{% highlight shell %}
mv ~/Downloads/rubygems-2.6.14.tgz ~/tmp/
cd ~/tmp/
tar -xvf rubygems-2.6.14.tgz
sudo ruby setup.rb

{% endhighlight %}

and `which gem` now gives `/usr/local/bin/gem`.

 * RubyGems &#10004;

## Install Jekyll
 ___

 `gem install jekyll` should do the trick. But wait!

 {% highlight shell %}

 ERROR:  While executing gem ... (Gem::Exception)
     Unable to require openssl, install OpenSSL and rebuild ruby (preferred) or use non-HTTPS sources
 {% endhighlight %}

so I guess we can add:

* install OpenSSL
to the list. But a `which openssl` shows `/Users/berto/anaconda3/bin/openssl` or `/usr/bin/openssl`. Hmm. If I reconfigure Ruby with `./configure --with-openssl-dir=/usr/bin`, it _still_ doesn't work. Looks like I'll try the managed approach.

## Install Ruby (Second Attempt)

Ok, so this time I will try [ruby-install](https://github.com/postmodern/ruby-install#readme). I need to get `gpg`. Easiest way to do this is with `homebrew`. Running `brew install gnupg gnupg2` (see https://stackoverflow.com/q/27041885/5392922) gives me a weird error -
{% highlight shell %}
`/usr/local/Homebrew/Library/Homebrew/brew.rb:12:in '<main>': Homebrew must be run under Ruby 2.3! You're running 2.0.0. (RuntimeError)`.
{% endhighlight %}
Following this up brought me to this thread  https://stackoverflow.com/q/24652996/5392922, basically in upgrading to macOS Sierra (10.12), something broke in the permissions for `/usr/local/`, so to try `sudo chown -R $(whoami):admin /usr/local`.

So, installing using brew with the new permissions, and setting an alias with `alias usebrews 'setenv PATH /usr/local/opt:$PATH'`, should mean I can install `ruby-install`. Phew. Let's try `brew install ruby-install`.

Then
{% highlight shell %}
> ruby-install ruby
Successfully installed ruby 2.4.2 into /Users/berto/.rubies/ruby-2.4.2

> gem install jekyll
{% endhighlight %}

it works! I've set up my path so `alias myruby 'setenv PATH /Users/berto/.rubies/ruby-2.4.0/bin:$PATH'` to make this the active version.

> Note: before I got this to work I had loads of issues. See below.

### Issues I encountered

All of them. This was quite frustrating and was partly due to my messed up permissions due to an OS update, and restoring my user from backup _after_ another username had set up the machine.

The biggest problem I ran into (and didn't debug properly due to it being late in the day) looked like this:

{% highlight shell %}
> jekyll build
WARN: Unresolved specs during Gem::Specification.reset:
      rouge (< 3, >= 1.7)
WARN: Clearing out unresolved specs.
Please report a bug if this causes problems.
/Users/berto/.rubies/ruby-2.4.2/lib/ruby/gems/2.4.0/gems/bundler-1.16.0/lib/bundler/runtime.rb:313:in 'check_for_activated_spec!': You have already activated public_suffix 3.0.0, but your Gemfile requires public_suffix 2.0.5. Prepending `bundle exec` to your command may solve this. (Gem::LoadError)
{% endhighlight %}

To fix this, I had to install bundler, delete my `Gemfile.lock` and reinstall the bundle of dependencies. I'm new at Ruby, maybe this is something I should have done anyway.

{% highlight shell %}
cd ~/Projects/RobFirth.github.io/
gem install bundler
rm gemfile.lock
bundle install
{% endhighlight %}

---

## Workflow

So now when I'm in the right place `~/Projects/RobFirth.github.io/` for the site, I can use the following to build the site:

{% highlight shell %}
jekyll build
# => The current folder will be generated into ./_site

jekyll build --destination <destination>
# => The current folder will be generated into <destination>

jekyll build --source <source> --destination <destination>
# => The <source> folder will be generated into <destination>

jekyll build --watch
# => The current folder will be generated into ./_site,
#    watched for changes, and regenerated automatically.
{% endhighlight %}

{% highlight shell %}
jekyll serve
# => A development server will run at http://localhost:4000/
# Auto-regeneration: enabled. Use '--no-watch' to disable.
jekyll serve --detach

# => Same as 'jekyll serve' but will detach from the current terminal.
#    If you need to kill the server, you can 'kill -9 1234' where "1234" is the PID.
#    If you cannot find the PID, then do, 'ps aux | grep jekyll'```' and kill the instance.
{% endhighlight %}

and these to look at the changes locally, before I push:


So you can test locally, before your `git push` to make sure nothing breaks.
