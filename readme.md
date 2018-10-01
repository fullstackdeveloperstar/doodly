# whiteboard

> Whiteboard Software Video Creator App

## Dev

Install the dependencies

```
$ cd app && yarn install && cd .. && yarn install
```

Compile the app and watch for changes

```
$ yarn gulp
```

Run the app

```
$ yarn start
```

### deploy

```
$ yarn deploy
```

This deployment command has the following requirements:

```
- create a file called .env in the current folder
- add env variables for AWS
- add env variable for Mac signing certificate (present in Keychain)
- add env variable for Windows signing certificate (link to and password) (currently the cert is kept on the doodly.net server)
```

Here's an example of what this file should look like. Please do not set these env variables in any other way, as during the deployment process they might be reset as needed.

````
export AWS_ACCESS_KEY_ID="XXXXXXXXXX"
export AWS_SECRET_ACCESS_KEY="XXXXXXXXXX"

export CSC_NAME="Company, Inc. (XXXXXXXXXX)" # mac signature
export CSC_LINK="https://www.doodly.net/cert/XXXXXXXXXX.p12" # win signature for electron apps
export CSC_KEY_PASSWORD="XXXXXXXXXX" # key for sig```
````
![alt text](https://github.com/fullstackdeveloperstar/doodly/blob/master/doodly.png)