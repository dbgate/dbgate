<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />

    <title>DbGate</title>
    <meta name="theme-color" content="#000000" />
    <meta
      name="description"
      content="DbGate - web based opensource database administration tool for MS SQL, MySQL, Postgre SQL"
    />

    <link rel="icon" type="image/png" href="favicon.ico" />
    <link rel="manifest" href="manifest.json" />

    <link rel="stylesheet" href="global.css" />
    <link rel="stylesheet" href="tokens.css" />
    <link rel="stylesheet" href="dimensions.css" />
    <link rel="stylesheet" href="bulma.css" />
    <link rel="stylesheet" href="icon-colors.css" />
    <link rel="stylesheet" href="build/bundle.css" />
    <link rel="stylesheet" href="build/fonts/materialdesignicons.css" />
    <link rel="stylesheet" href="build/diff2html.min.css" />

    <script lang="javascript">
      window.dbgate_page = '{{page}}';
    </script>


    <script defer src="build/bundle.js"></script>

    <style>
      .lds-ellipsis {
        display: inline-block;
        position: relative;
        width: 80px;
        height: 80px;
      }
      .lds-ellipsis div {
        position: absolute;
        top: 33px;
        width: 13px;
        height: 13px;
        border-radius: 50%;
        background: #000;
        animation-timing-function: cubic-bezier(0, 1, 1, 0);
      }
      .lds-ellipsis div:nth-child(1) {
        left: 8px;
        animation: lds-ellipsis1 0.6s infinite;
      }
      .lds-ellipsis div:nth-child(2) {
        left: 8px;
        animation: lds-ellipsis2 0.6s infinite;
      }
      .lds-ellipsis div:nth-child(3) {
        left: 32px;
        animation: lds-ellipsis2 0.6s infinite;
      }
      .lds-ellipsis div:nth-child(4) {
        left: 56px;
        animation: lds-ellipsis3 0.6s infinite;
      }
      @keyframes lds-ellipsis1 {
        0% {
          transform: scale(0);
        }
        100% {
          transform: scale(1);
        }
      }
      @keyframes lds-ellipsis3 {
        0% {
          transform: scale(1);
        }
        100% {
          transform: scale(0);
        }
      }
      @keyframes lds-ellipsis2 {
        0% {
          transform: translate(0, 0);
        }
        100% {
          transform: translate(24px, 0);
        }
      }

      #starting_dbgate_zero {
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: space-around;
      }

      .inner-flex {
        display: flex;
        align-items: center;
        flex-direction: column;
      }
    </style>
  </head>

  <body>
    <div id="starting_dbgate_zero">
      <div class="inner-flex">
        <div class="lds-ellipsis">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>
    </div>
  </body>
</html>
