remove this 'ccess notes (optional, e.g. black gate)' this is the booking also, above this we have another input change that lable shows lists of the address of the customer and allow which address the customer wants to select.

- we have South Jakarta
  Central Jakarta
  Depok under the input remove that these redudant we dont need those.
- [StandaloneMessenger.tsx](file;file:///b%3A/react-native/Cepat/src/components/chat/StandaloneMessenger.tsx) -> are you fucking serious abou the name? we rename it to ChatContianer.tsx this is the main container, now make ChatHeader.tsx, ChatComposer.tsx this is where the textarea and button appears, ChatContent, this is where the message appears..
  please do not be stupid, you're a react native developer
  __
  ERROR SyntaxError: B:\react-native\Cepat\src\components\BookingLifecyclePanel.tsx: Expected corresponding JSX closing tag for <View>. (871:12)

869 | >
870 | {t("booking.reviewSubmitted")}

> 871 | </Text>
> | ^
> 872 | ) : (
> 873 | <>
> 874 | <View style={styles.starsRow}>
> __
> i have already created the components @chat folder
> Android Bundling failed 871ms node_modules\expo-router\entry.js (1 module)
> ERROR SyntaxError: B:\react-native\Cepat\src\components\BookingLifecyclePanel.tsx: Expected corresponding JSX closing tag for <View>. (871:12)

869 | >
870 | {t("booking.reviewSubmitted")}

> 871 | </Text>
> | ^
> 872 | ) : (
> 873 | <>
> 874 | <View style={styles.starsRow}>
> at constructor (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:369:19)
> at TypeScriptParserMixin.raise (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:6600:19)
> at TypeScriptParserMixin.jsxParseElementAt (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:4749:16)
> at TypeScriptParserMixin.jsxParseElement (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:4771:17)
> at TypeScriptParserMixin.parseExprAtom (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:4781:19)
> at TypeScriptParserMixin.parseExprSubscripts (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:7985:23)
> at TypeScriptParserMixin.parseUpdate (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:7970:21)
> at TypeScriptParserMixin.parseMaybeUnary (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:7950:23)
> at TypeScriptParserMixin.parseMaybeUnary (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:13606:18)
> at TypeScriptParserMixin.parseMaybeUnaryOrPrivate (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:7796:61)
> at TypeScriptParserMixin.parseExprOps (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:7801:23)
> at TypeScriptParserMixin.parseMaybeConditional (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:7778:23)
> at TypeScriptParserMixin.parseMaybeAssign (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:7728:21)
> at B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:13544:39
> at TypeScriptParserMixin.tryParse (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:6937:20)
> at TypeScriptParserMixin.parseMaybeAssign (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:13544:18)
> at B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:7697:39
> at TypeScriptParserMixin.allowInAnd (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:9345:12)
> at TypeScriptParserMixin.parseMaybeAssignAllowIn (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:7697:17)
> at TypeScriptParserMixin.parseMaybeAssignAllowInOrVoidPattern (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:9412:17)
> at TypeScriptParserMixin.parseParenAndDistinguishExpression (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:8584:28)
> at TypeScriptParserMixin.parseExprAtom (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:8240:23)
> at TypeScriptParserMixin.parseExprAtom (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:4786:20)
> at TypeScriptParserMixin.parseExprSubscripts (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:7985:23)
> at TypeScriptParserMixin.parseUpdate (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:7970:21)
> at TypeScriptParserMixin.parseMaybeUnary (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:7950:23)
> at TypeScriptParserMixin.parseMaybeUnary (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:13606:18)
> at TypeScriptParserMixin.parseMaybeUnaryOrPrivate (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:7796:61)
> at TypeScriptParserMixin.parseExprOps (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:7801:23)
> at TypeScriptParserMixin.parseMaybeConditional (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:7778:23)
> at TypeScriptParserMixin.parseMaybeAssign (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:7728:21)
> at TypeScriptParserMixin.parseMaybeAssign (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:13555:20)
> at TypeScriptParserMixin.parseExpressionBase (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:7681:23)
> at B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:7677:39
> at TypeScriptParserMixin.allowInAnd (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:9340:16)
> at TypeScriptParserMixin.parseExpression (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:7677:17)
> at TypeScriptParserMixin.parseReturnStatement (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:10073:28)
> at TypeScriptParserMixin.parseStatementContent (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:9717:21)
> at TypeScriptParserMixin.parseStatementContent (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:13277:18)
> at TypeScriptParserMixin.parseStatementLike (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:9686:17)
> at TypeScriptParserMixin.parseStatementListItem (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:9666:17)
> at TypeScriptParserMixin.parseBlockOrModuleBlockBody (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:10247:61)
> at TypeScriptParserMixin.parseBlockBody (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:10240:10)
> at TypeScriptParserMixin.parseBlock (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:10228:10)
> at TypeScriptParserMixin.parseFunctionBody (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:9016:24)
> at TypeScriptParserMixin.parseFunctionBodyAndFinish (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:9002:10)
> at TypeScriptParserMixin.parseFunctionBodyAndFinish (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:12941:18)
> at B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:10375:12
> at TypeScriptParserMixin.withSmartMixTopicForbiddingContext (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:9322:14)
> at TypeScriptParserMixin.parseFunction (B:\react-native\Cepat\node_modules\@babel\parser\lib\index.js:10374:10)
