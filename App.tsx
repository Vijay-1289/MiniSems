import React, {useEffect} from 'react';
import {Alert} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {I18nextProvider} from 'react-i18next';
import i18n from './src/i18n';
import RootNavigator from './src/navigation/RootNavigator';
import * as Updates from 'expo-updates';

const App: React.FC = () => {
  useEffect(() => {
    const checkUpdates = async () => {
      if (__DEV__) return; // Skip check in local expo development
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          Alert.alert(
            'New Version Available',
            'An updated version of MiniSems is ready to install. Would you like to update and restart now?',
            [
              {text: 'Later', style: 'cancel'},
              {
                text: 'Update Now',
                onPress: async () => {
                  await Updates.reloadAsync();
                },
              },
            ],
            {cancelable: false}
          );
        }
      } catch (error) {
        console.log('OTA update check failed:', error);
      }
    };

    checkUpdates();
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <GestureHandlerRootView style={{flex: 1}}>
        <SafeAreaProvider>
          <RootNavigator />
          <Toast />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </I18nextProvider>
  );
};

export default App;
