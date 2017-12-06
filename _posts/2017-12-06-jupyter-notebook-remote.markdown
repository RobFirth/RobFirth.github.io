---
layout: default
title:  "Acessing a Jupyter Notebook Kernel Remotely"
date:   2017-12-06 10:00:00
categories: main
---

# Useful Jupyter Notebook Tips - Acessing a Jupyter Notebook Kernel Remotely

---

One thing that you might want to do is to access your jupyter kernel remotely. For me, this was because of a mess of compilers and libraries on one machine making it difficult to build a particular module. By default, a notebook server runs locally at `127.0.0.1:8888` and is accessible only from localhost

There are a number of good guides out there, I followed the jupyter docs that are very comprehensive [here](http://jupyter-notebook.readthedocs.io/en/stable/public_server.html).

The first thing I had to do was update the jupyer notebook version from 4.X to 5.X. To do this was as simple as `pip install notebook --upgrade` (`pip install jupyter --upgrade` is not sufficient).

## Prerequisite: A Notebook Configuration File

Check to see if you have a notebook configuration file, `jupyter_notebook_config.py`. The default location for this file is your Jupyter folder in your home directory,` ~/.jupyter`.

If you don’t already have one, create a config file for the notebook using the following command:

`$ jupyter notebook --generate-config`

## Generating and Adding a Hashed Password to your Notebook Configuration File

As of notebook version 5.0, you can enter and store a password for your notebook server with a single command. jupyter notebook password will prompt you for your password and record the hashed password in your `jupyter_notebook_config.json`.

{% highlight shell %}
$ jupyter notebook password
Enter password:  ****
Verify password: ****
[NotebookPasswordApp] Wrote hashed password to /Users/you/.jupyter/jupyter_notebook_config.json
{% end highlight %}

You can prepare a hashed password manually, using the function notebook.auth.security.passwd():

{% highlight python %}
In [1]: from notebook.auth import passwd
In [2]: passwd()
Enter password:
Verify password:
Out[2]: 'sha1:67c9e60bb8b6:9ffede0825894254b2e042ea597d771089e11aed'
{% end highlight %}

You can then add the hashed password to your jupyter_notebook_config.py. *Reminder*: The default location for this file `jupyter_notebook_config.py` is in your Jupyter folder in your home directory, `~/.jupyter`, e.g.:

`c.NotebookApp.password = u'sha1:67c9e60bb8b6:9ffede0825894254b2e042ea597d771089e11aed'`

## Using SSL for encrypted communication

A self-signed certificate can be generated with openssl. For example, the following command will create a certificate valid for 365 days with both the key and certificate data written to the same file:

{% highlight shell %}
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout mykey.key -out mycert.pem
{% end highlight %}

You can start the notebook to communicate via a secure protocol mode by setting the certfile option to your self-signed certificate, i.e. mycert.pem, with the command:

{% highlight shell %}
jupyter notebook --certfile=mycert.pem --keyfile mykey.key
{% end highlight %}

## Running a Public Server

Now you have secured with SSL certfile and a hashed password, the configuration options that you should uncomment and edit in jupyter_notebook_config.py is the following:

{% highlight python %}
# Set options for certfile, ip, password, and toggle off
# browser auto-opening
c.NotebookApp.certfile = u'/absolute/path/to/your/certificate/mycert.pem'
c.NotebookApp.keyfile = u'/absolute/path/to/your/certificate/mykey.key'
# Set ip to '*' to bind on all interfaces (ips) for the public server
c.NotebookApp.ip = '*'
c.NotebookApp.password = <your hashed password here>
# c.NotebookApp.open_browser = False ## Only if you don't want a window to open on the host

# It is a good idea to set a known, fixed port for server access
c.NotebookApp.port = 1234
{% end highlight %}
You can then start the notebook using the jupyter notebook command.

## Get Connected!

To connect remotely, fire up a browser and point it at `https://<hostname>:<port>`. You will be asked to enter the password, and off you go!
