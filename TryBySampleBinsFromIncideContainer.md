## Try MQ sample binaries from inside the container

### 1. Enter the MQ container

On your host:

```bash
docker compose -f compose/docker-compose.yml exec -it ibm-mq bash
```

Now you’re inside the container.

### 2. Set up the MQ environment

Inside the container, run:

```bash
. /opt/mqm/bin/setmqenv -s
```

The leading dot is important—it sources the script into your shell.

### 3. Check that the queue manager is running

```bash
dspmq
```

You should see something like:

```
QMNAME(QM1) STATUS(RUNNING)
```

If it’s not running:

```bash
strmqm QM1
```

### 4. Create a test queue

Use `runmqsc` to send MQSC commands:

```bash
runmqsc QM1
```

At the `runmqsc` prompt, type:

```
DEFINE QLOCAL('TEST.IN')
END
```

- `DEFINE QLOCAL('TEST.IN')` creates a local queue called `TEST.IN`.
- `END` exits `runmqsc`.

### 5. Put a message to the queue (send)

Use the sample put program:

```bash
/opt/mqm/samp/bin/amqsput TEST.IN QM1
```

You’ll see a prompt. Type a line (your message), for example:

```
hello from amqsput
```

Press Enter after the line, and when you’re done, press `Ctrl + D` (EOF). That ends input and sends the message to `TEST.IN`.

### 6. Get a message from the queue (read)

Read the message back:

```bash
/opt/mqm/samp/bin/amqsget TEST.IN QM1
```

You should see something like:

```
Sample AMQSGET0 start
message <1>
hello from amqsput
Sample AMQSGET0 end
```

That proves:

- The queue exists
- MQ is working
- You can put and get messages
