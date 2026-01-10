import { View, Text, SafeAreaView, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import React, { useEffect, useState, useContext } from 'react';
import BigRect from '../BigRect';
import { UserContextNavApp } from '../../navigation/NavApp';
import { collection, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../../config';

const WIDTH = Dimensions.get('window').height;

const Cathegorie = ({ route, navigation }) => {
  const { cathegorie } = route.params || {};
  const { currentUserdata } = useContext(UserContextNavApp) || {};
  const [data, setData] = useState([]);
  const [loader, setLoader] = useState(true);

  useEffect(() => {
    if (!currentUserdata?.email) {
      setLoader(false);
      return;
    }

    const loadData = async () => {
      try {
        let allItems = [];

        // Déterminer si c'est une catégorie de mémoires
        const isMemoireCategory = cathegorie && cathegorie.toLowerCase().includes('memoire');

        if (isMemoireCategory) {
          // Charger depuis la collection Memoire
          console.log('Chargement des mémoires pour la catégorie:', cathegorie);
          const memoireQuery = query(collection(db, "BiblioThesis"));
          const memoireSnapshot = await getDocs(memoireQuery);

          memoireSnapshot.forEach((doc) => {
            const data = doc.data();
            console.log('Mémoire trouvé:', data);
            allItems.push({
              ...data,
              id: doc.id,
              type: 'memoire'
            });
          });

          // Filtrer par catégorie de mémoire avec mapping corrigé
          if (cathegorie !== 'Memoire') {
            // Mapping des catégories de mémoires vers les départements
            const categoryMap = {
              'Memoire GI': 'Genie Informatique',
              'Memoire GC': 'Genie Civil',
              'Memoire GM': 'Genie Mecanique',
              'Memoire GInd': 'Genie Industriel',
              'Memoire GEle': 'Genie Electrique',
              'Memoire GTel': 'Genie Telecom'
            };

            const targetDepartment = categoryMap[cathegorie];
            console.log(`Filtrage pour ${cathegorie} -> département: ${targetDepartment}`);

            if (targetDepartment) {
              allItems = allItems.filter(item => {
                const itemDept = item.département || item.departement;
                const matches = itemDept === targetDepartment;
                console.log(`Mémoire "${item.theme || item.name}" - Département: "${itemDept}" - Match: ${matches}`);
                return matches;
              });
            }
          }

          console.log(`${allItems.length} mémoires trouvés après filtrage pour ${cathegorie}`);

        } else {
          // Charger depuis BiblioInformatique pour les livres normaux
          console.log('Chargement des livres pour la catégorie:', cathegorie);

          // Charger depuis toutes les collections pertinentes
          const collections = ['BiblioBooks'];

          for (const collectionName of collections) {
            try {
              const q = query(collection(db, collectionName), orderBy("name", "asc"));
              const querySnapshot = await getDocs(q);

              querySnapshot.forEach((doc) => {
                const data = doc.data();
                allItems.push({
                  ...data,
                  id: doc.id,
                  collection: collectionName,
                  type: 'livre'
                });
              });
            } catch (error) {
              console.error(`Erreur lors du chargement de ${collectionName}:`, error);
            }
          }

          // Filtrer par catégorie
          allItems = allItems.filter(item => item.cathegorie === cathegorie);
        }

        console.log(`${allItems.length} éléments trouvés pour la catégorie ${cathegorie}`);
        setData(allItems);
        setLoader(false);

      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        setLoader(false);
      }
    };

    loadData();
  }, [currentUserdata?.email, cathegorie]);

  if (loader) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ marginTop: 10 }}>Chargement en cours...</Text>
      </View>
    );
  }

  if (!currentUserdata?.email) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Veuillez vous connecter pour accéder à cette page</Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, textAlign: 'center', color: '#666' }}>
          Aucun {cathegorie?.toLowerCase().includes('memoire') ? 'mémoire' : 'livre'} trouvé dans cette catégorie
        </Text>
      </View>
    );
  }

  return (
    <ScrollView>
      <View style={{
        height: 50,
        alignSelf: 'center',
        backgroundColor: '#DCDCDC',
        width: WIDTH
      }}>
        <Text style={{
          textAlign: 'center',
          fontWeight: '600',
          fontFamily: 'San Francisco',
          marginTop: 10,
          fontSize: 20
        }}>
          {cathegorie || 'Catégorie non spécifiée'}
        </Text>
      </View>
      <View style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        {data.map((item, index) => (
          <BigRect
            key={`${item.id || index}-${item.type}`}
            type={item.type}
            datUser={currentUserdata}
            cathegorie={item.cathegorie || item.département || item.departement}
            props={navigation}
            name={item.name || item.titre || item.theme}
            desc={item.desc || item.description || item.abstract}
            etagere={item.etagere}
            exemplaire={item.exemplaire || 1}
            image={item.image}
            salle={item.salle}
            commentaire={item.commentaire || []}
            nomBD={item.collection || 'Memoire'}
            // Champs spécifiques BiblioThesis
            annee={item.annee}
            superviseur={item.superviseur}
            keywords={item.keywords}
            pdfUrl={item.pdfUrl}
            matricule={item.matricule}
            theme={item.theme}
            createdAt={item.createdAt}
            département={item.département}
          />
        ))}
      </View>
    </ScrollView>
  );
};

export default Cathegorie;