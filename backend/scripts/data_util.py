from ref.box_mapping import box_mapping

class dataUtil:

    def __init__(self):
        pass

    @staticmethod
    # add box name to location
    def alter_location(box_name, mc_array):

        for obj in mc_array:
            obj['location'] = box_name + '/' + obj['location']

        return mc_array

    @staticmethod
    # create diff df for verify tube location and checking NGS tray
    def create_diff_df(df1, df2, df2_col, join_on):

        # perform outer join
        diff_df = df1.merge(df2, how='outer', on=join_on)

        diff_df['match'] = (diff_df['database entry'] == diff_df[df2_col]).astype(str).str.upper()

        diff_df = diff_df.rename(columns={'micronic code': 'micronic file entry'})
        diff_df = diff_df.fillna("NA")

        return diff_df

