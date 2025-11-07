# Hosty.live

## Overview

Hosty.live is a tool that makes hosting static web apps on the Internet Computer extremely easy.
From within your browser you start by creating a hosting canister. Then you paste a GitHub repo URL where the frontapp source code lives. The hosty.live backend will build the assets and upload them into your canister, and your web app is live! You can also configure custom domains from within the tool.

## Motivation

Whether the developers of a static web app are human or AI, the source code will in most cases end up on GitHub or is easily exported there. 
Once it is on GitHub hosty.live comes in and makes all the remaining steps easy: building, deploying, hosting. No knowledge of the IC, no tokens, no command line are required.

## How it works

### Components overview

The components are:

* Frontend (served from canister)
* Backend (web2 component)
* Status proxy canister
* Auth canister

#### Frontend

The frontend requires login with Internet Identity. The principal from II controls a built-in cycle wallet, controls canisters and performs canister management actions directly from the frontend.

#### Backend

The web2 backend is a build system that can take frontend source code from a zip file or a GitHub URL, build the assets, and upload them into an asset canister.

The web2 backend also registers custom domains and queries DNS records for the user.

#### Status proxy canister

The status proxy is a blackhole canister which is added as an additional controller to all hosting canisters.
Firstly, it makes the cycle balance visible to the public.
Secondly, it has the ability to make asset canisters completely immutable by removing all other controllers and removing all commit permissions inside the asset canister.

#### Auth canister

The auth canister provides an elegant way to allow an II principal to log into a web2 backend. The frontend creates an epheremal secret and uploads the hash of it into the auth canister.
The web2 backend queries the auth canister to verify the presence of the hash.

### Cycle wallet

The frontend has a self-custodial cycle wallet built in.
It can be funded via credit card through an integration with cycle.express or via a transfer of TCYCLES to the II principal.

They cycles wallet can be used to create new canisters or to top up existing canisters.

Note: There is currently no withdrawal from the cycle wallet.

### Canister creation

Canisters are created directly from the frontend and are given two controllers: the frontend (II principal) and the status proxy.

### Gifted canister

The hosty.live backend provides one canister for free as a gift to each user principal. 
This is done so that users can start the experience even before they obain any cycles.

### Deployment

The source can be provided as a branch in a GitHub repo or as a zip file.

To build the backend accepts a build command.
The default is `npm run build` but the user can provide a different one.

To deploy the assets the backend accepts the relative path pointing to where the assets are after building.
The default path is `dist` but the user can provide a different one.

It is also possible to supply already built assets and to skip the build step entirely.
To do this, `true` should be entered as the build command.
If the already built assets are in the root directory then `./` can be entered as the path.

### Web2 login

The web2 backend authenticates users by their II principal.
This works as follows.
After II login is complete, 
the frontend creates an ephermal secret and uploads a hash of it to the auth canister.
For this, the auth canister has one slot to store a blob for each calling principal.
The frontend establishes a connection to the web2 backend and requests login by providing its principal and the ephemeral secret.
The web2 backend then hashes the secret and queries the principal's data slot in the auth canister.
If they match then login is granted and the web2 backend issues a JWT and returns it to the frontend.

This process has the advantage that login is performed in a single request from the frontend, just like if email/password were used.
A challenge-response protocol with a server-generated challenge would be more complicated.

Another advantage is that the web2 backend does not have to understand delegation chains.

### Custom domains

Custom domains can be registered with great convenience.
The user enters the desired custom domain and hosty.live will dynamically generate the exact DNS records that need to be created.
The user can copy-paste the values from the frontend into the registrar's configuration.
Then hosty.live will check in real-time if the records are all configured correctly.
It will also report when the updated records have propagated to Google's DNS servers.
When that is the case then the user can register the custom domain with the IC's boundary nodes by clicking a button.
Hosty.live will perform the necessary call in the background.

### Changing ownership and sole custody

Additional controllers can be added to the individual hosting canisters. 
For example, after an initial phase of operating under hosty.live an advanced user may decide to take sole custody of a hosting canister.
The user can add a dfx principal through the frontend and then use dfx to remove all other controllers.

### Immutable canisters

Users can develop their web app under hosty.live and when it is finalized they can make an "immutable release".
There is a button to make a hosting canister immutable,
i.e. its assets cannot be changed by anyone anymore.
To achieve this, the frontend calls the blackholed status proxy which already is a controller from the beginning.
The status proxy then removes all other controllers except itself
and also removes all other permissions inside the asset canister.
The status proxy remains a controller so that the hosting canister's cycle balance remains publicly visible.

With the immutability feature, sole custody is no longer needed. Instead, a hosting canister can transition directly from being on hosty.live to being immutable. 

Note: In order to allow experimentation with this feature without wasting canisters, the immutability feature of the status proxy can be called in debug mode.
In this case, the status proxy will save the previous controller list and will allow to revert the action.

Note: Currently, the status proxy is not actually blackholed.
This is because we are at the hackathon stage and intend to still add more features to the status proxy.

### Public page

Each canister created by hosty.live also has a public page. Its URL can be obtained by the owner by clicking on the "Share" button.
If this URL is published then anyone can see information about the canister such as, for example, the cycle balance.
This is mainly done so that immutable canisters can be monitored and topped-up by the public.

## Example repos

Here is a list of GitHub repo URLs that can be used to try out deploment.
Note that you can deploy the hosty.live frontend itself through hosty.live into your own canister.

|URL|branch|build command|output directory|comment|
|---|---|---|---|---|
|https://github.com/research-ag/hosty-live|main|npm run build|dist|Hosty.live frontend itself!|
|https://github.com/research-ag/wallet|main|npm run build|dist|ICRC-1 web wallet|
|https://github.com/itkrivoshei/Vanilla-Js-ToDoList.git|main|true|./|pure assets, no building|
|https://github.com/tejachundru/react-vite-starter.git|main|npm run build|dist||
|https://github.com/xiaoluoboding/vue3-starter.git|main|npm run build|dist||
|https://github.com/emptydiagram/svelte-counter.git|canon|npm run build|public||
