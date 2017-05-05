## Example
### Default connect without zookeeper
```
start server:
    node ./server_client/server_common.js
    
start client:   
    node ./server_client/client_common.js 
```


### Http connect without zookeeper
```
start server:
    node ./server_client/server_http.js
    
start client:
    node ./server_client/client_http.js
```


### WebSocket connect without zookeeper
```
start server:
    node ./server_client/server_websocket.js
    
start client:
    node ./server_client/client_websocket.js
```

### Default connect with zookeeper
> PS: Please Confirm Zookeeper Server Start at "localhost: 2181"

```
start server:
    node ./zserver_zclient/zserver_common.js
    
start client:
    node ./zserver_zclient/zclient.js
```

### Http connect with zookeeper
>PS: Please Confirm Zookeeper Server Start at 'localhost: 2181'

```
start server:
    node ./zserver_zclient/zserver_http.js
    
start client:
    node ./zserver_zclient/zclient.js
```

### WebSocket connect with zookeeper
>PS: Please Confirm Zookeeper Server Start at 'localhost: 2181'

```
start server:
    node ./zserver_zclient/zserver_websocket.js
    
start client:
    node ./zserver_zclient/zclient.js
```

